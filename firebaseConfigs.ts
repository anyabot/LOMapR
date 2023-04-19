// Import the functions you need from the SDKs you need
import 'firebase/auth'
import 'firebase/database'
import { getStorage, ref, getDownloadURL } from "firebase/storage";

var admin = require("firebase-admin");

var serviceAccount = {
  type: process.env.type as string,
  project_id: process.env.project_id as string,
  private_key_id: process.env.private_key_id as string,
  private_key: process.env.private_key ? process.env.private_key.replace(/\\n/gm, "\n")
  : undefined,
  client_email: process.env.client_email as string,
  client_id: process.env.client_id as string,
  auth_uri: process.env.auth_uri as string,
  token_uri: process.env.token_uri as string,
  auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url as string,
  client_x509_cert_url: process.env.client_x509_cert_url as string
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://lomap-9cf31-default-rtdb.firebaseio.com"
  });
}

// Initialize Firebase
// export const app = initializeApp(firebaseConfig);
export const db = admin.database()