const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const { uploadFileToBunny } = require("../../cdn/bunnyCDN");

const CHUNKS_DIR = path.join(__dirname, "../../uploads/chunks");

// Helper to ensure directory exists
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const uploadChunk = async (req, res) => {
  try {
    const { filename, chunkIndex, totalChunks, folder } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No chunk file uploaded" });
    }

    if (!filename || chunkIndex === undefined || totalChunks === undefined) {
      return res.status(400).json({ success: false, message: "Missing chunk metadata" });
    }

    const chunkDir = path.join(CHUNKS_DIR, filename);
    ensureDir(chunkDir);

    // Save current chunk part
    const chunkPath = path.join(chunkDir, `part_${chunkIndex}`);
    await fsPromises.rename(req.file.path, chunkPath);

    // Check if all chunks have been uploaded
    const expectedChunks = Number(totalChunks);
    let allUploaded = true;
    for (let i = 0; i < expectedChunks; i++) {
      const partPath = path.join(chunkDir, `part_${i}`);
      if (!fs.existsSync(partPath)) {
        allUploaded = false;
        break;
      }
    }

    // If all chunks exist, join them together
    if (allUploaded) {
      const finalFileName = filename.substring(filename.indexOf("-") + 1);
      const mergedFilePath = path.join(chunkDir, finalFileName);
      
      console.log(`Assembling ${expectedChunks} chunks for ${finalFileName}...`);
      
      const writeStream = fs.createWriteStream(mergedFilePath);

      for (let i = 0; i < expectedChunks; i++) {
        const partPath = path.join(chunkDir, `part_${i}`);
        const data = await fsPromises.readFile(partPath);
        writeStream.write(data);
        // Delete chunk file after writing to save disk space
        await fsPromises.unlink(partPath);
      }
      
      writeStream.end();

      // Wait for stream to finish writing
      await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      console.log(`Uploading completed file ${finalFileName} to Bunny CDN...`);
      const remotePath = `${folder || "others"}/${finalFileName}`;
      
      // Upload the joined file to Bunny CDN
      const result = await uploadFileToBunny({
        filePath: mergedFilePath,
        remotePath,
        contentType: req.file.mimetype,
      });

      // Cleanup final merged file and directory
      try {
        await fsPromises.unlink(mergedFilePath);
        await fsPromises.rmdir(chunkDir);
      } catch (err) {
        console.error("Cleanup error:", err);
      }

      console.log(`Upload completed successfully! URL: ${result.url}`);
      return res.json({
        success: true,
        message: "File assembled and uploaded successfully",
        url: result.url,
        cdnUrl: result.url,
        path: result.path,
      });
    }

    return res.json({
      success: true,
      message: `Chunk ${chunkIndex}/${totalChunks} received successfully`,
    });
  } catch (error) {
    console.error("Chunk upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Chunk upload failed",
      error: error.message,
    });
  }
};

module.exports = {
  uploadChunk,
};
