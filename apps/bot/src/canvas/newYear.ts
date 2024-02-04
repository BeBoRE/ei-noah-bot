import { createCanvas, loadImage } from 'canvas';
import { AttachmentBuilder } from 'discord.js';

export const generateNewYearImage = async (year: number) => {
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');

  const fireworksImage = await loadImage('./src/images/fireworks.png');
  const fireworksWidth = 800;
  const fireworksHeight = 600;

  // Put image in middle of screen
  const xFw = (canvas.width - fireworksWidth) / 2;
  const yFw = (canvas.height - fireworksHeight) / 2;

  ctx.drawImage(fireworksImage, xFw, yFw, fireworksWidth, fireworksHeight);

  const eiImage = await loadImage('./avatars/ei.png');
  const avatarWidth = 300;
  const avatarHeight = avatarWidth;

  // Put image in middle of screen
  const x = (canvas.width - avatarWidth) / 2;
  const y = (canvas.height - avatarHeight) / 2 - 100;

  const suitImage = await loadImage('./src/images/suit.png');
  const suitScale = 0.3;

  const suitWidth = suitImage.width * suitScale;
  const suitHeight = suitImage.height * suitScale;

  // Place on bottom of screen
  const xSuit = (canvas.width - suitWidth) / 2;
  const ySuit = y + 240;

  ctx.drawImage(suitImage, xSuit, ySuit, suitWidth, suitHeight);
  ctx.drawImage(eiImage, x, y, avatarWidth, avatarHeight);

  const fireworksImage2 = await loadImage('./src/images/fireworks-2.png');
  const fireworksWidth2 = 450;
  const fireworksHeight2 =
    fireworksImage2.height * (fireworksWidth2 / fireworksImage2.width);

  // Place on bottom of screen
  const xFw2 = 0;
  const yFw2 = canvas.height - fireworksHeight2 + 50;

  // Change blend mode to add
  ctx.globalCompositeOperation = 'lighten';

  ctx.drawImage(fireworksImage2, xFw2, yFw2, fireworksWidth2, fireworksHeight2);

  const fireworksImage3 = await loadImage('./src/images/fireworks-3.png');
  const fireworksWidth3 = 450;
  const fireworksHeight3 =
    fireworksImage3.height * (fireworksWidth3 / fireworksImage3.width);

  // Place on bottom of screen
  const xFw3 = canvas.width - fireworksWidth3;
  const yFw3 = canvas.height - fireworksHeight3 + 50;

  ctx.drawImage(fireworksImage3, xFw3, yFw3, fireworksWidth3, fireworksHeight3);

  ctx.globalCompositeOperation = 'source-over';

  const fontSize = 90;
  const text = `Gelukkig ${year}!`;

  const yText = canvas.height / 2 + 100;

  ctx.fillStyle = '#ebb614';
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width / 2, yText + fontSize);
  ctx.strokeText(text, canvas.width / 2, yText + fontSize);

  // Text Glow
  ctx.globalCompositeOperation = 'lighten';

  ctx.globalAlpha = 0.5;

  ctx.shadowColor = '#537bf7';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillText(text, canvas.width / 2, yText + fontSize);
  ctx.strokeText(text, canvas.width / 2, yText + fontSize);

  return new AttachmentBuilder(canvas.createPNGStream());
};
