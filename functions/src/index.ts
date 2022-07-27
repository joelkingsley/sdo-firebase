import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

admin.initializeApp(functions.config().firebase);

// On sign up.
exports.processSignUp = functions.auth.user().onCreate(async (user) => {
  const customClaims = {
    "https://hasura.io/jwt/claims": {
      "x-hasura-default-role": "user",
      "x-hasura-allowed-roles": ["user"],
      "x-hasura-user-id": user.uid,
    },
  };

  if (user.email && user.displayName && user.uid) {
    const hasuraGraphQLService = new HasuraGraphQLService();
    hasuraGraphQLService.insertUser(user.email, user.displayName, user.uid)
      .then(() => {
        return admin.auth().setCustomUserClaims(user.uid, customClaims);
      })
      .then(() => {
        // Update real-time database to notify client to force refresh.
        const metadataRef = admin.database().ref("metadata/" + user.uid);
        return metadataRef.set({
          refreshTime: new Date().getTime(),
        });
      })
      .catch((error) => {
        console.error(error);
      });
  }
});

class HasuraGraphQLService {
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
