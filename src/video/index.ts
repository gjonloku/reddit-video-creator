import cluster from "cluster";
import { writeFileSync } from "fs";
import { join } from "path";
import {
  commentPath,
  ffmpegFile,
  imagePath,
  introPath,
  midPath,
  outroPath,
  tempAudio,
  tempData,
} from "../config/paths";
import { video } from "../config/video";

import { Comment, CommentText } from "../interface/post";
import { spreadWork } from "../utils/render";
import { mergeVideos } from "./lib";

type MergeFrames = (args: { comments: Comment[][] }) => Promise<null>;

/**
 * Merge Frames
 */
export const mergeFrames: MergeFrames = async ({ comments }) => {
  return new Promise((resolve) => {
    const introData = {
      image: imagePath(introPath, 0),
      audio: join(tempAudio, "intro.mp3"),
      exportPath: introPath,
      title: "video-0",
    };

    const outroData = {
      image: imagePath(outroPath, 0),
      audio: join(tempAudio, "outro.mp3"),
      exportPath: outroPath,
      title: "video-0",
    };

    const midData = {
      image: imagePath(midPath, 0),
      audio: join(__dirname, "..", "..", "public", "null.mp3"),
      exportPath: midPath,
      title: "video-0",
    };

    const files: {
      image: string;
      audio: string;
      exportPath: string;
      title: string;
    }[] = [introData, outroData, midData];

    const fileList: string[] = [
      ffmpegFile(
        join(introData.exportPath, `${introData.title}.${video.fileFormat}`)
      ),
      ffmpegFile(
        join(midData.exportPath, `${midData.title}.${video.fileFormat}`)
      ),
    ];

    for (let i = 0; i < comments.length; i++) {
      const commentGroupPath = commentPath(i);

      const lastBody = comments[i][comments[i].length - 1]
        .body as CommentText[];
      let totalFrames = lastBody[lastBody.length - 1].frame;

      for (let j = 0; j < comments[i].length; j++) {
        const body = comments[i][j].body as CommentText[];

        for (let k = 0; k < body.length; k++) {
          const { frame } = body[k];

          const commentData = {
            image: imagePath(
              commentGroupPath,
              String(frame).padStart(Math.ceil(totalFrames / 10), "0")
            ),
            audio: join(tempAudio, `${[i, j, k].join("-")}.mp3`),
            exportPath: commentGroupPath,
            title: `video-${frame}`,
          };

          files.push(commentData);

          fileList.push(
            ffmpegFile(
              join(
                commentData.exportPath,
                `${commentData.title}.${video.fileFormat}`
              )
            )
          );
        }
      }

      fileList.push(
        ffmpegFile(
          join(midData.exportPath, `${midData.title}.${video.fileFormat}`)
        )
      );
    }

    fileList.push(
      ffmpegFile(
        join(outroData.exportPath, `${outroData.title}.${video.fileFormat}`)
      )
    );

    const listPath = join(tempData, "render-list.txt");

    writeFileSync(listPath, fileList.join(" \n"));

    const work = spreadWork(files);
    let counter = work.length;

    for (let index = 0; index < work.length; index++) {
      const jobs = work[index];

      const jobsFilePath = join(tempData, `${index}-video.json`);

      writeFileSync(jobsFilePath, JSON.stringify(jobs));

      cluster.setupPrimary({
        exec: join(__dirname, "worker.ts"),
        args: [jobsFilePath],
      });

      const worker = cluster.fork();

      worker.on("exit", () => {
        counter--;

        mergeVideos({
          listPath,
          exportPath: "C:\\Users\\licav\\Desktop",
        });

        if (counter === 0) {
          resolve(null);
        }
      });
    }
  });
};

type RenderVideo = (args: { comments: Comment[][] }) => Promise<void>;

const renderVideo: RenderVideo = async ({ comments }) => {
  await mergeFrames({
    comments,
  });
};

export default renderVideo;
