"""qwen provider：vision 角色实现（dashscope qwen-vl，OpenAI 兼容端点）。

目的：图像理解（关键帧分析、人脸候选、场景标签）走 dashscope qwen-vl 系列
      （https://dashscope.aliyuncs.com/compatible-mode/v1），配置按角色读取
      （VISION_* 或根 .env 的 DASHSCOPE_API_KEY）。多模态其余接口保留占位。
输入：analyze_image(image_bytes, prompt, mime)；chat 接口同 base。
输出：LLMResponse；未配置或异常时降级 mock（mock=True），不报错。
验收：tests/test_pipeline_vision.py —— mock server 下 analyze_image 返回非 mock；
      降级路径沿用既有 stub 行为（tests/test_pipeline.py 保持绿）。

TODO(算法待打磨)：face_embedding/image_gen 两接口仍为占位；transcribe 已接
dashscope 音频理解模型（qwen-audio-turbo，ASR_MODEL 可调，格式待官网核对）。
"""

import base64
import os
from pathlib import Path

from app.agents.llm.base import LLMProvider, LLMResponse, register_provider

# 音频理解模型（dashscope 兼容模式；拿不准的具体消息格式以 ASR_MODEL 可调）
DEFAULT_ASR_MODEL = "qwen-audio-turbo"
_AUDIO_FORMAT_BY_EXT = {".wav": "wav", ".mp3": "mp3", ".m4a": "m4a"}


class QwenProvider(LLMProvider):
    role = "vision"
    name = "qwen"

    def analyze_image(self, image_bytes: bytes, prompt: str,
                      mime: str = "image/jpeg") -> LLMResponse:
        """OpenAI 兼容多模态消息：data URL 内联图片 + 文本提示。"""
        if not self.config.get("configured"):
            return LLMResponse(text=f"[mock:{self.model}] 未配置 vision API，返回占位分析",
                               model=self.model, mock=True)
        data_url = f"data:{mime};base64,{base64.b64encode(image_bytes).decode()}"
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            }
        ]
        return self.chat(messages, response_format={"type": "json_object"})

    def face_embedding(self, image_path: str) -> list:
        # TODO(算法待打磨)：接入真实人脸 embedding 端点
        return [0.0] * 128

    def image_gen(self, prompt: str, out_path: str) -> str:
        # TODO(算法待打磨)：接入 dashscope 生图（根 .env IMAGE_GEN_*，队友研究模块）
        return out_path

    def transcribe(self, audio_path: str) -> LLMResponse:
        """语音转写：dashscope 兼容模式 + 音频理解模型（默认 qwen-audio-turbo，
        环境变量 ASR_MODEL 可调）。音频以 data-URL 内联进 input_audio 消息项。

        TODO(格式待核)：dashscope 文档对 qwen-audio 系列的 input_audio format
        枚举（wav/mp3/m4a）与模型名以官网为准；不匹配时调 ASR_MODEL 或改此处。
        """
        if not self.config.get("configured"):
            return LLMResponse(
                text=f"[mock:{self.model}] transcribe 未配置，返回占位（原始音频：{audio_path}）",
                model=self.model, mock=True)
        audio = Path(audio_path)
        fmt = _AUDIO_FORMAT_BY_EXT.get(audio.suffix.lower(), "mp3")
        data_url = f"data:audio/{fmt};base64,{base64.b64encode(audio.read_bytes()).decode()}"
        model = os.environ.get("ASR_MODEL", "").strip() or DEFAULT_ASR_MODEL
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "input_audio",
                     "input_audio": {"data": data_url, "format": fmt}},
                    {"type": "text",
                     "text": "请将这段音频逐字转写为文本，只输出转写内容，不要评论。"},
                ],
            }
        ]
        return self.chat(messages, model=model)


register_provider("vision", QwenProvider)
