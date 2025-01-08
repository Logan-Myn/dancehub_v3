import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
};

const app =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseAdminConfig);

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);

export async function getCommunityData(slug: string) {
  const communityRef = adminDb.collection('communities').where('slug', '==', slug);
  const snapshot = await communityRef.get();
  
  if (snapshot.empty) {
    throw new Error('Community not found');
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  
  return {
    id: doc.id,
    name: data.name,
    createdBy: data.createdBy,
    membersCount: data.membersCount || 0,
    ...data
  };
}
