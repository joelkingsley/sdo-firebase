import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { HasuraGraphQLService } from "./services/hasura-graphql-service";
import { VideoRepository } from "./repositories/video-repository";
import { BucketRepository } from "./repositories/bucket-repository";
import { TokenRepository } from "./repositories/token-repository";

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

admin.initializeApp();

// On sign up.
exports.processSignUp = functions.auth.user().onCreate(async (user) => {
  const customClaims = {
    "https://hasura.io/jwt/claims": {
      "x-hasura-default-role": "user",
      "x-hasura-allowed-roles": ["user"],
      "x-hasura-user-id": user.uid,
    },
  };

  if (user.email && user.uid) {
    const hasuraGraphQLService = new HasuraGraphQLService();
    hasuraGraphQLService.insertUserLegacy(user.email, user.uid)
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
        functions.logger.error(error);
      });
  } else {
    functions.logger.error(
      `Either email, displayName or uid is null: email=${user.email} uid=${user.uid}`
    );
  }
});

// Get Video URL data
exports.getSignedUrlOfVideo = functions.https.onRequest(async (req, res): Promise<any> => {
  const videoId = (req.body.videoId as string | undefined);
  const videoRepository = new VideoRepository();
  return videoRepository.getSignedUrlOfVideoLegacy(req, res, videoId);
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

// Get signed cookie
exports.getSignedCookie = functions.https.onRequest(async (req, res): Promise<any> => {
  const urlPrefix = (req.body.urlPrefix as string | undefined);
  const keyName = (req.body.keyName as string | undefined);
  const key = (req.body.key as string | undefined);
  const expiration = (req.body.expiration as number | undefined);
  const videoRepository = new VideoRepository();
  return videoRepository.signCookie(req, res, urlPrefix, keyName, key, expiration);
});

// Get configs
exports.getConfigs = functions.https.onRequest(async (req, res): Promise<any> => {
  const adminKey = process.env.HASURA_ADMIN_KEY;
  return res.send({ configs: { hasuraAdminKey: adminKey } });
});

// Get Apple ID refresh token
exports.getAppleIdRefreshToken = functions.https.onRequest(async (req, res): Promise<any> => {
  const tokenRepository = new TokenRepository();
  return tokenRepository.getAppleIdRefreshToken(req, res);
});

// Revoke Apple ID refresh token
exports.revokeAppleIdRefreshToken = functions.https.onRequest(async (req, res): Promise<any> => {
  const tokenRepository = new TokenRepository();
  return tokenRepository.revokeAppleIdRefreshToken(req, res);
});

// v2 methods
// On sign up.
exports.processSignUpV2 = functions.auth.user().onCreate(async (user) => {
  const customClaims = {
    "https://hasura.io/jwt/claims": {
      "x-hasura-default-role": "user",
      "x-hasura-allowed-roles": ["user"],
      "x-hasura-user-id": user.uid,
    },
  };

  if (user.email && user.uid) {
    const hasuraGraphQLService = new HasuraGraphQLService();
    hasuraGraphQLService.insertUser(user.email, user.uid)
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
        functions.logger.error(error);
      });
  } else {
    functions.logger.error(
      `Either email, displayName or uid is null: email=${user.email} uid=${user.uid}`
    );
  }
});

// Get Video URL data
exports.getSignedUrlOfVideoV2 = functions.https.onRequest(async (req, res): Promise<any> => {
  const videoId = (req.body.videoId as string | undefined);
  const videoRepository = new VideoRepository();
  return videoRepository.getSignedUrlOfVideo(req, res, videoId);
});
