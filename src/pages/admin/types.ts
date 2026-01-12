import { Timestamp } from 'firebase/firestore'

export type MenuItem = 'home' | 'main-slide' | 'books' | 'ad-management' | 'member-management' | 'review-management'

export interface MemberData {
  id: string;
  uid: string;
  name: string;
  nickname: string;
  phone: string;
  email: string;
  address: string;
  blog?: string;
  instagram?: string;
  level: string;
  createdAt: any;
  isAdmin?: boolean;
}

export interface BookData {
  id: string;
  title: string;
  author: string;
  category: string;
  genre: string;
  description: string;
  imageUrl?: string;
  rating: number;
  reviewCount: number;
  status: string;
  createdAt: any;
  publisher?: string;
  publishedDate?: string;
}

export interface SlideData {
  id: string;
  slideType?: 'main' | 'ad';
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  linkType: 'book' | 'custom';
  order: number;
  isActive: boolean;
  createdAt: any;
  updatedAt?: any;
  titleColor?: string;
  subtitleColor?: string;
  postingStart?: Timestamp | null;
  postingEnd?: Timestamp | null;
}

export interface ReviewApplicationData {
  서평ID: string;
  회원ID: string;
  도서ID: string;
  신청일: any;
  처리상태: '서평신청' | '도서발송' | '서평대기' | '서평완료';
  발송일: any | null;
  완료일: any | null;
  관리자메모: string;
  bookTitle: string;
  bookAuthor: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail: string;
  applicantAddress: string;
  applicantId?: string;
  applicantNickname?: string;
  applicantBlog?: string;
  applicantInstagram?: string;
  서평갯수?: number;
  createdAt: any;
  updatedAt: any;
}







