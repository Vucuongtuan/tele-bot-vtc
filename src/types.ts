export type OrderStatus = "waiting_date" | "waiting_content" | "waiting_file" | "processing" | "done";

export interface Article {
  cate: string;
  title: string;
  url: string;
  des: string;
}

export type NewsletterTemplate = "wwk" | "jewelry-1";

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

export interface Order {
  chatId: number;
  folderName: string;
  template?: NewsletterTemplate;
  content?: string;
  archiveFileId?: string;
  status: OrderStatus;
  updatedAt: Date;
}
