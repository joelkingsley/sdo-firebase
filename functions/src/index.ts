import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { HasuraGraphQLService } from "./services/hasura-graphql-service";
import { CloudflareStreamService } from "./services/cloudflare-stream-service";
import { VideoRepository } from "./repositories/video-repository";
import { BucketRepository } from "./repositories/bucket-repository";

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

// Get Video URL data
exports.getVideoUrlData = functions.https.onRequest(async (req, res): Promise<any> => {
  const videoId = (req.body.videoId as string | undefined);
  const videoRepository = new VideoRepository();
  return videoRepository.getUrlDataOfVideo(req, res, videoId);
});

// Get Signed Thumbnail URL of Videos
exports.getSignedThumbnailUrlOfVideos = functions.https.onRequest(async (req, res): Promise<any> => {
  const videoIds = (req.body.videoIds as Array<string> | undefined);
  const videoRepository = new VideoRepository();
  return videoRepository.getSignedThumbnailUrlOfVideos(req, res, videoIds);
});

// Get CORS configuration for bucket
exports.getCORSConfigurationForBucket = functions.https.onRequest(async (req, res): Promise<any> => {
  const bucketName = (req.body.bucketName as string | undefined);
  const bucketRepository = new BucketRepository();
  return bucketRepository.getCORSConfigurationOfBucket(req, res, bucketName);
});

// Configure CORS configuration on bucket
exports.configureCORSConfigurationOnBucket = functions.https.onRequest(async (req, res): Promise<any> => {
  const bucketName = (req.body.bucketName as string | undefined);
  const origin = (req.body.origin as string | undefined);
  const bucketRepository = new BucketRepository();
  return bucketRepository.configureCORSConfigurationOnBucket(req, res, bucketName, origin);
});
