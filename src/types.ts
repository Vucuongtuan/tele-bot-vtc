export type OrderStatus = "waiting_content" | "waiting_file" | "processing" | "done";

export interface Article {
  cate: string;
  title: string;
  url: string;
  des: string;
}

export interface Order {
  chatId: number;
  folderName: string;
  content?: string;
  archiveFileId?: string;
  status: OrderStatus;
  updatedAt: Date;
}
