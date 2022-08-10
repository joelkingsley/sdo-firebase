export class HasuraGraphQLService {
  adminKey = "Yr1mw58ZZaU2kva6JNTdcqOzUj233TxxkUJYMcTzgvb2YHtIzmDj81MWlmhCpn8v";

  async fetchGraphQL(
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

  operation = `
  mutation InsertUser($userEmail: String!, $userName: String!, $userUuid: String!) {
    insert_users_one(object: {user_email: $userEmail, user_name: $userName, user_uuid: $userUuid}) {
      user_email
      user_name
      user_uuid
    }
  }
`;

  insertUser(userEmail: string, userName: string, userUuid: string) {
    return this.fetchGraphQL(
      this.operation,
      "InsertUser",
      { "userEmail": userEmail, "userName": userName, "userUuid": userUuid }
    );
  }
}
