export class HasuraGraphQLService {
  private adminKey = process.env.HASURA_ADMIN_KEY as string;
  private adminKeyV2 = process.env.HASURA_ADMIN_KEY_V2 as string;

  /**
   * @param {string} operationsDoc
   * @param {string} operationName
   * @param {Record<string, any>} variables
   * @deprecated Legacy fetchGraphQL method. To be removed in next release.
   */
  private async fetchGraphQLLegacy(
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

  private async fetchGraphQL(
    operationsDoc: string,
    operationName: string,
    variables: Record<string, any>
  ) {
    const nodeFetch = await import("node-fetch");
    const result = await nodeFetch.default("https://sdo-hasura-prod.hasura.app/v1/graphql", {
      method: "POST",
      body: JSON.stringify({
        query: operationsDoc,
        variables,
        operationName,
      }),
      headers: {
        "x-hasura-admin-secret": this.adminKeyV2,
      },
    });
    return await result.json();
  }

  /**
   * @deprecated Legacy insertUser operation. To be removed in next release.
   */
  private insertUserOperationLegacy = `
  mutation InsertUser($userEmail: String!, $userUuid: String!) {
    insert_users_one(object: {user_email: $userEmail, user_uuid: $userUuid}) {
      user_email
      user_uuid
    }
  }
  `;

  private insertUserOperation = `
  mutation InsertUser($userEmail: String!, $userUuid: String!) {
    insert_User_one(object: {userEmail: $userEmail, userUuid: $userUuid}) {
      userEmail
      userUuid
    }
  }
  `;

  /**
   * @deprecated Legacy getCloudStorageVideoDetails operation. To be removed in next release.
   */
  private getCloudStorageVideoDetailsOperationLegacy = `
  query GetCloudStorageVideoDetails($videoId: uuid!) {
    videos(where: {video_id: {_eq: $videoId}}) {
      gcp_storage_file_name
      gcp_storage_bucket_name
    }
  }
  `;

  private getCloudStorageVideoDetailsOperation = `
  query GetCloudStorageVideoDetails($videoId: String!) {
    videos: Video(where: {id: {_eq: $videoId}}) {
      gcpStorageFileName
      gcpStorageBucketName
    }
  }
  `;

  /**
   * @param {string} userEmail
   * @param {string} userUuid
   * @deprecated Legacy insertUser method. To be removed in next release.
   */
  async insertUserLegacy(userEmail: string, userUuid: string): Promise<any> {
    return this.fetchGraphQLLegacy(
      this.insertUserOperationLegacy,
      "InsertUser",
      { "userEmail": userEmail, "userUuid": userUuid }
    );
  }

  /**
   * @param {string} videoId
   * @deprecated Legacy fetchGetCloudStorageVideoDetails method. To be removed in next release.
   */
  async fetchGetCloudStorageVideoDetailsLegacy(videoId: string): Promise<any> {
    return this.fetchGraphQLLegacy(
      this.getCloudStorageVideoDetailsOperationLegacy,
      "GetCloudStorageVideoDetails",
      { "videoId": videoId }
    );
  }

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
