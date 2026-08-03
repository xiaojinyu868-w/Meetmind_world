"""工具协议示例：原子工具如何定义、注册与被 LLM 调用。

目的：规定 Tool 的协议形态（名称/描述/参数 schema/执行函数），供后续
      tool1.py / tool2.py / ... 仿照添加；Tool 实现属于权限矩阵的禁止自进化项。
输入：ToolSpec 定义 + handler 可调用对象。
输出：Tool 实例，to_llm_schema() 生成可传给 chat(tools=...) 的描述。
验收：make_person_search_tool 在 tests 之外可独立运行（见本文件 __main__ 示例）。
"""

from dataclasses import dataclass, field


@dataclass
class Tool:
    """原子工具：一个名字、一段给模型看的描述、一份参数 schema、一个执行函数。"""

    name: str
    description: str
    parameters: dict = field(default_factory=dict)  # JSON Schema 风格
    handler: object = None  # callable(**kwargs) -> dict

    def run(self, **kwargs) -> dict:
        if not callable(self.handler):
            raise NotImplementedError(f"工具 {self.name} 未绑定执行函数")
        return self.handler(**kwargs)

    def to_llm_schema(self) -> dict:
        """转换为 OpenAI 兼容的 tool 描述，可直接放进 chat(tools=[...])。"""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters or {"type": "object", "properties": {}},
            },
        }


def make_person_search_tool(packages_store) -> Tool:
    """示例工具：按姓名/关键词检索人物（FR-1.9 占位实现）。

    TODO(算法待打磨)：当前为大小写不敏感的子串匹配；后续换成人脸匹配 +
    memory.md / relations.md 关键词索引（CONTEXT-AND-MEMORY.md §6）。
    """

    def _search(keyword: str) -> dict:
        keyword = (keyword or "").strip().lower()
        matches = [
            summary
            for summary in packages_store.list_packages()
            if keyword
            and (
                keyword in str(summary.get("name") or "").lower()
                or keyword in summary["person_id"].lower()
            )
        ]
        return {"matches": matches, "count": len(matches)}

    return Tool(
        name="search_person",
        description="按姓名或关键词检索已确认/未确认的人物资料包摘要",
        parameters={
            "type": "object",
            "properties": {
                "keyword": {"type": "string", "description": "姓名或关键词"},
            },
            "required": ["keyword"],
        },
        handler=_search,
    )


if __name__ == "__main__":
    from app.packages.store import PackageStore

    tool = make_person_search_tool(PackageStore())
    print(tool.to_llm_schema())
    print(tool.run(keyword="林"))
