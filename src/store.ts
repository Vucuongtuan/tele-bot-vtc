import { Firestore } from "@google-cloud/firestore";
import type { Order } from "./types.js";

interface FirebaseServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function createFirestore(): Firestore {
  const rawCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawCredentials) return new Firestore();

  let credentials: FirebaseServiceAccount;
  try {
    credentials = JSON.parse(rawCredentials) as FirebaseServiceAccount;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid service-account JSON");
  }
  if (!credentials.project_id || !credentials.client_email || !credentials.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing required service-account fields");
  }
  return new Firestore({
    projectId: credentials.project_id,
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
  });
}

const db = createFirestore();
const orders = db.collection("telegramOrders");

export async function saveOrder(order: Order): Promise<void> {
  await orders.doc(String(order.chatId)).set({ ...order, updatedAt: new Date() });
}

export async function getOrder(chatId: number): Promise<Order | undefined> {
  const snapshot = await orders.doc(String(chatId)).get();
  return snapshot.exists ? snapshot.data() as Order : undefined;
}

export async function clearOrder(chatId: number): Promise<void> {
  await orders.doc(String(chatId)).delete();
}
