import { TextSettings } from '../../app/textStore';

export const applyTextProperties = (
  settings: TextSettings,
) => ({
  fontFamily: settings.fontFamily,
  fontSize: settings.fontSize,
  fontWeight: settings.fontWeight,
  bold: settings.bold,
  italic: settings.italic,
  underline: settings.underline,
  align: settings.align,
  lineHeight: settings.lineHeight,
  letterSpacing: settings.letterSpacing,
  opacity: settings.opacity,
  boxMode: settings.boxMode,
  color: settings.color,
});
