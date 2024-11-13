import { adminAuth } from "./firebase-admin";

export async function verifyAuth(request: Request) {
  try {
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    
    if (!token) {
      return { user: null };
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    
    return {
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
      }
    };
  } catch (error) {
    console.error("Error verifying auth:", error);
    return { user: null };
  }
} 