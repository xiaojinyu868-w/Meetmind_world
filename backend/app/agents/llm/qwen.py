"""qwen provider：vision 角色实现（dashscope qwen-vl，OpenAI 兼容端点）。

目的：图像理解（关键帧分析、人脸候选、场景标签）走 dashscope qwen-vl 系列
      （https://dashscope.aliyuncs.com/compatible-mode/v1），配置按角色读取
      （VISION_* 或根 .env 的 DASHSCOPE_API_KEY）。多模态其余接口保留占位。
输入：analyze_image(image_bytes, prompt, mime)；chat 接口同 base。
输出：LLMResponse；未配置或异常时降级 mock（mock=True），不报错。
验收：tests/test_pipeline_vision.py —— mock server 下 analyze_image 返回非 mock；
      降级路径沿用既有 stub 行为（tests/test_pipeline.py 保持绿）。

TODO(算法待打磨)：face_embedding/image_gen/transcribe 三接口仍为占位
（转写建议接 dashscope ASR WS，根 .env 的 DASHSCOPE_ASR_WS_*，MVP1 未接）。
"""

import base64

from app.agents.llm.base import LLMProvider, LLMResponse, register_provider


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

    def transcribe(self, audio_path: str) -> str:
        # TODO(算法待打磨)：接入 dashscope ASR WS（DASHSCOPE_ASR_WS_*）
        return f"[mock:transcribe] 转写占位（原始音频：{audio_path}）"


register_provider("vision", QwenProvider)
