/** Explicit local executables, selected by the user or resolved on PATH. */
export const ffmpeg=()=>process.env.LOOPLILT_FFMPEG||'ffmpeg';
export const ffprobe=()=>process.env.LOOPLILT_FFPROBE||'ffprobe';
