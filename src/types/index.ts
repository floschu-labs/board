export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface List {
  id: string;
  projectId: string;
  name: string;
  position: number;
}

export interface Card {
  id: string;
  listId: string;
  title: string;
  description: string;
  link?: string;
  coverImageUrl?: string;
  dueDate?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoardExport {
  version: 1;
  exportedAt: string;
  projects: Project[];
  lists: List[];
  cards: Card[];
}
