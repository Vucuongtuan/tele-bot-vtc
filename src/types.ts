export type OrderStatus = "waiting_date" | "waiting_content" | "waiting_image_source" | "waiting_file" | "waiting_confirmation" | "processing" | "done";

export interface Article {
  cate: string;
  title: string;
  url: string;
  des: string;
}

export type NewsletterTemplate = "wwk" | "jewelry-1" | "jewelry-2";

export type JewelryBlock =
  | { type: "text"; paragraphs: string[] }
  | { type: "imagePair"; images: [number, number] };

export interface JewelryCredit {
  text: string;
  url?: string;
}

export interface JewelryTemplate1Content {
  category: string;
  title: string;
  url: string;
  heroImage: number;
  blocks: JewelryBlock[];
  credits: JewelryCredit[];
}

export interface JewelryArticle {
  category: string;
  title: string;
  url: string;
  description: string;
}

export interface JewelryPick {
  label: string;
  title: string;
  url: string;
}

export interface JewelryTemplate2Content {
  editorNote: string;
  editorSignature: string;
  featured: JewelryArticle;
  articles: [JewelryArticle, JewelryArticle];
  yourPickDescription?: string;
  picks: [JewelryPick, JewelryPick];
}

export interface Order {
  chatId: number;
  folderName: string;
  template?: NewsletterTemplate;
  content?: string;
  archiveFileId?: string;
  imageSource?: "zip" | "payload";
  status: OrderStatus;
  updatedAt: Date;
  gmail?: { messageId: string; threadId: string; from: string; subject: string; rfcMessageId?: string };
}

export interface GmailReplyDraft {
  chatId: number;
  folderName: string;
  messageId: string;
  threadId: string;
  from: string;
  subject: string;
  rfcMessageId?: string;
}
