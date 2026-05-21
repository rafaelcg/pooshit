import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { getConfig } from "../config.js";

const GRAPHQL_URL = "https://backboard.railway.com/graphql/v2";

interface GraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
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
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Railway GraphQL HTTP ${response.status}`);
  }

  const body = (await response.json()) as GraphqlResponse<T>;
  if (body.errors?.length) {
    throw new Error(body.errors.map((error) => error.message).join("; "));
  }
  if (!body.data) {
    throw new Error("Railway GraphQL returned no data");
  }

  return body.data;
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
): Promise<string> {
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
