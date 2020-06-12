import multer from 'multer'
import { uploadPath, uploadMaxSize } from '../config'

export const uploadField = 'file'

export const multerUpload = multer({
  dest: `${uploadPath}/`,
  limits: {
    fileSize: uploadMaxSize,
  },
})
