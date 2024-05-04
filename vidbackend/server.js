const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const http = require('http');
const cors = require('cors'); // CORS package
const socketIO = require('socket.io');

const mediainfo = require('node-mediainfo');
const fs = require('fs');


const app = express();
const server = http.createServer(app);
const io = socketIO(server,{
    cors: {
      origin: '*', // or specify specific origins if needed
      methods: ['GET', 'POST'],
    },
  });

app.use(cors());

// // Set the ffmpeg binary path
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffmpegPath);

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

app.use(express.static('public'));

const getDuration = (timemark) => {
    const parts = timemark.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);
  
    return hours * 3600 + minutes * 60 + seconds;
  };

// Endpoint to upload videos
// app.post('/upload', upload.array('videos', 10), (req, res) => {
//   const files = req.files;

//-------------------------------------------------------------------------------------------
//   files.forEach(async (file, index) => {
//     const inputPath = `./uploads/${file.filename}`;
//     const outputPath = `./uploads/${file.filename}.mpd`;


//     // const info = await mediainfo(inputPath);
//     // const videoDuration = info.media.track[0].Duration;
//     // const totalFrames = info.media.track[1].FrameCount;
//     // console.log("////////{", videoDuration)
//     // const videoDuration = metadata.format.duration; // Total duration of the video
//     console.log(file)
//     // Send progress updates via socket.io
//     ffmpeg(inputPath)
//   .addOptions(['-f', 'dash', '-use_template 1', '-use_timeline 1'])
//   .on('progress', (progress) => {

//     // const currentDuration = getDuration(progress.timemark);
//     // const estimatedPercent = (currentDuration / videoDuration) * 100;


//     io.emit('progress', { file: file.filename, progress: progress.percentage });
//     console.log(progress)
//   })
//   .on('end', () => {
//     io.emit('completed', { file: file.filename });
//   })
//   .save(outputPath);
//   });

//using ffprobe
//--------------------------------------------------------------------------
// files.forEach((file) => {
//     const inputPath = `./uploads/${file.filename}`;
//     const outputPath = `./uploads/${file.filename}.mpd`;

//     console.log("input path: ",inputPath)
//     // Retrieve metadata to get video duration and other info
//     ffmpeg.ffprobe(inputPath, (err, metadata) => {

        
//       if (err) {
//         console.error('Error retrieving metadata:', err);
//         return;
//       }

//       const videoDuration = metadata.format.duration; // Total duration in seconds
//       const totalFrames = metadata.streams[0].nb_frames; // Total frames in the video (if available)

//       console.log(`Video duration for ${file.filename}: ${videoDuration} seconds`);
//       console.log(`Total frames for ${file.filename}: ${totalFrames}`);

//       // Start FFmpeg processing
//       ffmpeg(inputPath)
//         .addOptions(['-f', 'dash', '-use_template 1', '-use_timeline 1'])
//         .on('progress', (progress) => {
//           // Calculate estimated progress based on timemark and total duration
//           const currentDuration = getDuration(progress.timemark);
//           const estimatedPercent = (currentDuration / videoDuration) * 100;

//           io.emit('progress', { file: file.filename, progress: estimatedPercent.toFixed(2) });
//           console.log(`Progress for ${file.filename}: ${estimatedPercent.toFixed(2)}%`);
//         })
//         .on('end', () => {
//           io.emit('completed', { file: file.filename });
//           console.log(`Completed processing: ${file.filename}`);
//         })
//         .save(outputPath);
//     });
//   });

//   res.json({ message: 'Files uploaded and processing started.' });
// });

//using mediainfo
//--------------------------------------------------------------------------

app.post('/upload', upload.array('videos', 10), (req, res) => {
    const files = req.files;
  
    files.forEach((file) => {
        const inputPath = `./uploads/${file.filename}`;
        const outputPath = `./uploads/${file.filename}.mpd`;
      
        console.log("Input path:", inputPath);
      
        // Retrieve metadata to get video duration and other info using MediaInfo
        mediainfo(inputPath).then((metadata) => {
          const videoDuration = metadata.media.track.find(track => track["@type"] === "Video")?.Duration;
          const totalFrames = metadata.media.track.find(track => track["@type"] === "Video")?.FrameCount;
      
          console.log(`Video duration for ${file.filename}: ${videoDuration} seconds`);
          console.log(`Total frames for ${file.filename}: ${totalFrames}`);
      
          // Continue with your existing FFmpeg processing logic
          ffmpeg(inputPath)
            .addOptions(['-f', 'dash', '-use_template 1', '-use_timeline 1'])
            .on('progress', (progress) => {
              const currentDuration = getDuration(progress.timemark);
              const estimatedPercent = (currentDuration / videoDuration) * 100;
      
              io.emit('progress', { file: file.filename, progress: estimatedPercent.toFixed(2) });
              console.log(`Progress for ${file.filename}: ${estimatedPercent.toFixed(2)}%`);
            })
            .on('end', () => {
              io.emit('completed', { file: file.filename });
              console.log(`Completed processing: ${file.filename}`);
            })
            .save(outputPath);
        }).catch((err) => {
          console.error('Error retrieving metadata with MediaInfo:', err);
        });
      });
  
    res.json({ message: 'Files uploaded and processing started.' });
  });


app.get('/', (req, res) => {
    res.send('Hello from Express with Firebase!');
  });

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});