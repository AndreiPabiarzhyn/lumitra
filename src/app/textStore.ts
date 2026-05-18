import { create } from 'zustand';

export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type TextBoxMode = 'auto' | 'fixed';

export type TextSettings = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: TextAlign;
  lineHeight: number;
  letterSpacing: number;
  opacity: number;
  boxMode: TextBoxMode;
  color: string;
};

type TextState = TextSettings & {
  setFontFamily: (fontFamily: string) => void;
  setFontSize: (fontSize: number) => void;
  setFontWeight: (fontWeight: number) => void;
  setBold: (bold: boolean) => void;
  setItalic: (italic: boolean) => void;
  setUnderline: (underline: boolean) => void;
  setAlign: (align: TextAlign) => void;
  setLineHeight: (lineHeight: number) => void;
  setLetterSpacing: (letterSpacing: number) => void;
  setOpacity: (opacity: number) => void;
  setBoxMode: (boxMode: TextBoxMode) => void;
  setColor: (color: string) => void;
};

export const useTextStore = create<TextState>((set) => ({
  fontFamily: 'Inter',
  fontSize: 48,
  fontWeight: 400,
  bold: false,
  italic: false,
  underline: false,
  align: 'left',
  lineHeight: 1.2,
  letterSpacing: 0,
  opacity: 1,
  boxMode: 'fixed',
  color: '#f2f5ff',
  setFontFamily: (fontFamily) => set({ fontFamily }),
  setFontSize: (fontSize) => set({ fontSize }),
  setFontWeight: (fontWeight) => set({ fontWeight }),
  setBold: (bold) => set({ bold, fontWeight: bold ? 700 : 400 }),
  setItalic: (italic) => set({ italic }),
  setUnderline: (underline) => set({ underline }),
  setAlign: (align) => set({ align }),
  setLineHeight: (lineHeight) => set({ lineHeight }),
  setLetterSpacing: (letterSpacing) => set({ letterSpacing }),
  setOpacity: (opacity) => set({ opacity }),
  setBoxMode: (boxMode) => set({ boxMode }),
  setColor: (color) => set({ color }),
}));
