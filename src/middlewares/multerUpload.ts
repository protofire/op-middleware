import multer from 'multer'

// Default upload path is relative to the app
export const uploadsPath = process.env.UPLOADS_PATH || 'uploads'

export const maxFileSize =
  process.env.MAX_FILE_SIZE !== undefined
    ? Number.parseInt(process.env.MAX_FILE_SIZE, 10)
    : 1024 * 1024 * 10
export const uploadField = 'file'

export const multerUpload = multer({
  dest: `${uploadsPath}/`,
  limits: {
    fileSize: maxFileSize,
  },
})
