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
    insertUser(user.email, user.displayName, user.uid)
      .then(({ data, errors }) => {
        if (errors) {
          console.error(errors);
        }
        console.log(data);
      })
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
