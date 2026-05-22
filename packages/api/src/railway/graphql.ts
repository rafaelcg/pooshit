import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { getConfig } from "../config.js";

const GRAPHQL_URL = "https://backboard.railway.com/graphql/v2";
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const MAX_GRAPHQL_ATTEMPTS = 5;

interface GraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatGraphqlHttpError(status: number, attempt: number, maxAttempts: number): string {
  if (RETRYABLE_STATUS.has(status) && attempt >= maxAttempts) {
    return `Railway API is temporarily unavailable (HTTP ${status}). Try again in a minute.`;
  }
  return `Railway GraphQL HTTP ${status}`;
}

export async function getRailwayBearerToken(): Promise<string> {
  const config = getConfig();

  if (config.railwayApiToken) {
    return config.railwayApiToken;
  }

  if (config.useCliLogin) {
    const configPath = join(homedir(), ".railway", "config.json");
    const raw = JSON.parse(await readFile(configPath, "utf-8")) as {
      user?: { token?: string; accessToken?: string };
    };
    const token = raw.user?.token ?? raw.user?.accessToken;
    if (token) {
      return token;
    }
  }

  throw new Error("No Railway auth token available for API calls");
}

export async function railwayGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const token = await getRailwayBearerToken();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_GRAPHQL_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        const message = formatGraphqlHttpError(response.status, attempt, MAX_GRAPHQL_ATTEMPTS);
        if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_GRAPHQL_ATTEMPTS) {
          lastError = new Error(message);
          await sleep(attempt * 1000);
          continue;
        }
        throw new Error(message);
      }

      const body = (await response.json()) as GraphqlResponse<T>;
      if (body.errors?.length) {
        throw new Error(body.errors.map((error) => error.message).join("; "));
      }
      if (!body.data) {
        throw new Error("Railway GraphQL returned no data");
      }

      return body.data;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("fetch failed") &&
        attempt < MAX_GRAPHQL_ATTEMPTS
      ) {
        lastError = error;
        await sleep(attempt * 1000);
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error("Railway GraphQL request failed");
}

export async function deleteRailwayServiceById(serviceId: string): Promise<void> {
  await railwayGraphql<{ serviceDelete: boolean }>(
    `mutation serviceDelete($id: String!) {
      serviceDelete(id: $id)
    }`,
    { id: serviceId },
  );
}

export async function findServiceIdByName(
  projectId: string,
  serviceName: string,
): Promise<string | null> {
  const data = await railwayGraphql<{
    project: {
      services: { edges: Array<{ node: { id: string; name: string } }> };
    } | null;
  }>(
    `query projectServices($id: String!) {
      project(id: $id) {
        services {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    }`,
    { id: projectId },
  );

  const match = data.project?.services.edges.find(
    (edge) => edge.node.name === serviceName,
  );

  return match?.node.id ?? null;
}

export async function resolveProjectId(projectRef: string): Promise<string> {
  if (/^[0-9a-f-]{36}$/i.test(projectRef)) {
    return projectRef;
  }

  const data = await railwayGraphql<{
    projects: { edges: Array<{ node: { id: string; name: string } }> };
  }>(
    `query projects {
      projects {
        edges {
          node {
            id
            name
          }
        }
      }
    }`,
  );

  const match = data.projects.edges.find((edge) => edge.node.name === projectRef);
  if (!match) {
    throw new Error(
      `Railway project "${projectRef}" not found. Create it in the dashboard or set RAILWAY_PROJECT to the project ID.`,
    );
  }

  return match.node.id;
}

export async function resolveEnvironmentId(
  projectId: string,
  environmentName: string,
  cachedEnvironmentId?: string,
): Promise<string> {
  if (cachedEnvironmentId && /^[0-9a-f-]{36}$/i.test(cachedEnvironmentId)) {
    return cachedEnvironmentId;
  }

  const data = await railwayGraphql<{
    project: {
      environments: { edges: Array<{ node: { id: string; name: string } }> };
    } | null;
  }>(
    `query projectEnvironments($id: String!) {
      project(id: $id) {
        environments {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    }`,
    { id: projectId },
  );

  const match = data.project?.environments.edges.find(
    (edge) => edge.node.name === environmentName,
  );

  if (!match) {
    throw new Error(
      `Railway environment "${environmentName}" not found in project ${projectId}.`,
    );
  }

  return match.node.id;
}

export async function createEmptyService(options: {
  projectId: string;
  environmentId: string;
  name: string;
}): Promise<string> {
  const data = await railwayGraphql<{
    serviceCreate: { id: string; name: string };
  }>(
    `mutation serviceCreate($input: ServiceCreateInput!) {
      serviceCreate(input: $input) {
        id
        name
      }
    }`,
    {
      input: {
        projectId: options.projectId,
        environmentId: options.environmentId,
        name: options.name,
      },
    },
  );

  return data.serviceCreate.id;
}

export type RailwayDeploymentStatus =
  | "BUILDING"
  | "DEPLOYING"
  | "SUCCESS"
  | "FAILED"
  | "CRASHED"
  | "REMOVED"
  | "SLEEPING"
  | "SKIPPED"
  | "WAITING"
  | string;

export async function getLatestDeploymentStatus(
  serviceId: string,
): Promise<RailwayDeploymentStatus | null> {
  const data = await railwayGraphql<{
    service: {
      serviceInstances: {
        edges: Array<{
          node: {
            latestDeployment: { status: RailwayDeploymentStatus } | null;
          };
        }>;
      };
    } | null;
  }>(
    `query serviceDeployment($id: String!) {
      service(id: $id) {
        serviceInstances {
          edges {
            node {
              latestDeployment {
                status
              }
            }
          }
        }
      }
    }`,
    { id: serviceId },
  );

  return (
    data.service?.serviceInstances.edges[0]?.node.latestDeployment?.status ?? null
  );
}

export async function ensureServicePublicDomain(options: {
  environmentId: string;
  serviceId: string;
}): Promise<string> {
  const data = await railwayGraphql<{
    serviceDomainCreate: { domain: string };
  }>(
    `mutation serviceDomainCreate($input: ServiceDomainCreateInput!) {
      serviceDomainCreate(input: $input) {
        domain
      }
    }`,
    {
      input: {
        environmentId: options.environmentId,
        serviceId: options.serviceId,
      },
    },
  );

  const domain = data.serviceDomainCreate.domain;
  if (!domain) {
    throw new Error("Railway did not return a public domain");
  }

  return domain.startsWith("http") ? domain : `https://${domain}`;
}
