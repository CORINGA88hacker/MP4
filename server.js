const express = require("express");
const multer = require("multer");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.static("public")); // servir index.html

const upload = multer({ dest: "uploads/" });

// rota de upload
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });

  const inputPath = req.file.path;
  const fileId = path.parse(req.file.filename).name;
  const outDir = path.join(__dirname, "out", fileId);

  fs.mkdirSync(outDir, { recursive: true });

  const outM3u8 = path.join(outDir, "playlist.m3u8");

  const ffmpeg = spawn("ffmpeg", [
    "-y",
    "-i", inputPath,
    "-profile:v", "baseline",
    "-level", "3.0",
    "-start_number", "0",
    "-hls_time", "10",
    "-hls_list_size", "0",
    "-f", "hls",
    outM3u8
  ]);

  ffmpeg.stderr.on("data", data => console.log("ffmpeg:", data.toString()));

  ffmpeg.on("close", code => {
    fs.unlinkSync(inputPath); // remove o arquivo temporário

    if (code === 0) {
      res.json({
        message: "Conversão concluída",
        playlist: `/out/${fileId}/playlist.m3u8`
      });
    } else {
      res.status(500).json({ error: "Falha na conversão com FFmpeg." });
    }
  });
});

// servir os .m3u8 e .ts
app.use("/out", express.static(path.join(__dirname, "out")));

app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});
