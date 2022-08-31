import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { HasuraGraphQLService } from "./services/hasura-graphql-service";
import { CloudflareStreamService } from "./services/cloudflare-stream-service";

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

// Generate Cloudflare Stream token
// TODO: - Remove after finalizing Google Cloud Storage
exports.generateCloudflareStreamToken = functions.https.onRequest(async (req, res): Promise<any> => {
  const videoId = (req.body.videoId as string | undefined);
  if (videoId == undefined) {
    return res.status(400).send({ error: "videoId should not be empty" });
  } else {
    const idToken = req.get("Authorization")?.replace("Bearer ", "") ?? "";
    return admin.auth().verifyIdToken(idToken)
      .then(() => {
        const cloudflareStreamService = new CloudflareStreamService();
        return cloudflareStreamService.generateStreamToken(videoId);
      })
      .then((streamToken) => {
        return res.json({ result: streamToken });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).send({ error: "Error while generating stream token" });
      });
  }
});

// Generate signed url for Google Cloud Storage
exports.createGoogleCloudStorageSignedUrl = functions.https.onRequest(async (req, res): Promise<any> => {
  const videoId = (req.body.videoId as string | undefined);
  if (videoId == undefined) {
    return res.status(400).send({ error: "videoId should not be empty" });
  } else {
    try {
      // Verify id token
      const idToken = req.get("Authorization")?.replace("Bearer ", "") ?? "";
      await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      return res.status(401).send({ error: { code: "TOKEN_INVALID", errorObject: err } });
    }

    // Get cloud storage video details
    const hasuraGraphQLService = new HasuraGraphQLService();
    const cloudStorageVideoDetails = await hasuraGraphQLService.fetchGetCloudStorageVideoDetails(videoId)
      .then(({ data }) => {
        return data?.videos[0];
      })
      .catch((err) => {
        return res.status(500).send({ error: { code: "SERVER_ERROR", errorObject: err } });
      });

    // Validate bucketName and fileName
    const bucketName: string | undefined = cloudStorageVideoDetails?.gcp_storage_bucket_name;
    const fileName: string | undefined = cloudStorageVideoDetails?.gcp_storage_file_name;
    if (bucketName == undefined || fileName == undefined) {
      if (bucketName == undefined && fileName == undefined) {
        return res.status(500).send({
          error: {
            code: "SERVER_ERROR",
            message: "bucketName and fileName not found",
          },
        });
      } else if (bucketName == undefined) {
        return res.status(500).send({
          error: {
            code: "SERVER_ERROR",
            message: "bucketName not found",
          },
        });
      } else {
        return res.status(500).send({
          error: {
            code: "SERVER_ERROR",
            message: "fileName not found",
          },
        });
      }
    }

    try {
      // Creates a client
      const storage = admin.storage();

      // These options will allow temporary read access to the file
      const options = {
        version: "v4" as "v2" | "v4",
        action: "read" as "read" | "write" | "delete" | "resumable",
        expires: Date.now() + 60 * 60 * 1000, // 60 minutes
      };

      // Get a v4 signed URL for reading the file
      const [url] = await storage
        .bucket(bucketName)
        .file(fileName)
        .getSignedUrl(options);
      console.log(`Generated GET signed URL: ${url}`);
      console.log("You can use this URL with any user agent, for example:");
      console.log(`curl '${url}'`);
      return res.status(200).send({ signedUrl: url });
    } catch (err) {
      return res.status(500).send({ error: { code: "SIGNING_URL_ERROR", errorObject: err } });
    }
  }
});
