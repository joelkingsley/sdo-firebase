export class HasuraGraphQLService {
  private adminKey = process.env.HASURA_ADMIN_KEY as string;

  private async fetchGraphQL(
    operationsDoc: string,
    operationName: string,
    variables: Record<string, any>
  ) {
    const nodeFetch = await import("node-fetch");
    const result = await nodeFetch.default("https://sdo-hasura.hasura.app/v1/graphql", {
      method: "POST",
      body: JSON.stringify({
        query: operationsDoc,
        variables,
        operationName,
      }),
      headers: {
        "x-hasura-admin-secret": this.adminKey,
      },
    });
    return await result.json();
  }

  private insertUserOperation = `
  mutation InsertUser($userEmail: String!, $userUuid: String!) {
    insert_users_one(object: {user_email: $userEmail, user_uuid: $userUuid}) {
      user_email
      user_uuid
    }
  }
  `;

  private getCloudStorageVideoDetailsOperation = `
  query GetCloudStorageVideoDetails($videoId: uuid!) {
    videos(where: {video_id: {_eq: $videoId}}) {
      gcp_storage_file_name
      gcp_storage_bucket_name
    }
  }
  `;

  async insertUser(userEmail: string, userUuid: string): Promise<any> {
    return this.fetchGraphQL(
      this.insertUserOperation,
      "InsertUser",
      { "userEmail": userEmail, "userUuid": userUuid }
    );
  }

  async fetchGetCloudStorageVideoDetails(videoId: string): Promise<any> {
    return this.fetchGraphQL(
      this.getCloudStorageVideoDetailsOperation,
      "GetCloudStorageVideoDetails",
      { "videoId": videoId }
    );
  }
}
