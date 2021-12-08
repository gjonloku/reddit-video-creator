import { join } from "path";

import Jimp from "jimp";
import { decode } from "html-entities";

import { fontPath } from "../config/paths";
import { imageDetails, commentDetails } from "../config/image";
import { FontFace } from "../interface/image";
import { Comment } from "../interface/post";

/**
 * Generate array of sentences from comment
 * @param {string} text Comment text
 */
const splitText = (text: string): string[] => {
  // Decode html code to text
  const words = decode(
    text
      // Remove emoji
      .replace(
        /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
        ""
      )
      // Remove \n etc
      .replace(/\r?\n|\r/g, " ")
      // Remove url
      .replace(/(?:https?|ftp):\/\/[\n\S]+/g, "")
  )
    .split(" ")
    .filter((text) => text.trim() !== "");

  if (words.length === 1) {
    return words;
  }

  const sentences: string[] = [];
  let sentence: string[] = [];

  for (const word of words) {
    sentence.push(word);

    const chars = [",", ".", "!", "?"];

    const mergedText = sentence.join(" ");

    if (
      (chars.some((char) => word.includes(char)) && mergedText.length > 30) ||
      mergedText.length > 80
    ) {
      sentences.push(mergedText);
      sentence = [];
    }
  }

  if (sentence.length !== 0) {
    sentences.push(sentence.join(" "));
  }

  return sentences.map((c) => c.trim());
};

/**
 * Get Width, Height and Indentation for each comment
 * @param comments Comments List
 * @returns Comments with width, height and indentation for each comment
 */
export const measureContent = async (comments: Comment[]) => {
  try {
    const parentPath = join(fontPath, "comments");
    const font = await Jimp.loadFont(join(parentPath, FontFace.Comment));
    const fontBold = await Jimp.loadFont(join(parentPath, FontFace.Username));

    const userNameText = `/y/Name`;
    const userNameHeight = Jimp.measureTextHeight(
      fontBold,
      userNameText,
      Jimp.measureText(fontBold, userNameText)
    );

    let totalProcesses = 0;

    const newComments = comments.map((comment) => {
      const commentWidth =
        imageDetails.width -
        commentDetails.widthMargin -
        comment.depth * commentDetails.depth;

      const splittedText = splitText(comment.content as string);

      totalProcesses += splittedText.length;

      const commentHeight =
        Jimp.measureTextHeight(font, splittedText.join(" "), commentWidth) +
        userNameHeight +
        commentDetails.margin;

      return {
        ...comment,
        content: splittedText.map((text, index) => ({
          content: text.trim(),
          id: index,
        })),
        width: commentWidth,
        height: commentHeight,
      };
    });

    console.log(
      `process-count=${totalProcesses * 4 + comments.length * 2 + 1}`
    );

    return newComments;
  } catch (error) {
    throw error;
  }
};
