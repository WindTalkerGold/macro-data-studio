## 宏观经济数据本地化治理与可视化平台

### 1. 项目概述
*   **项目名称**：MacroData Studio
*   **核心目标**：构建一个本地优先的Web应用，允许用户手动上传官方宏观经济数据（通常为CSV格式文件），通过AI辅助标准化为JSON，并进行版本管理、智能合并与自定义可视化。
*   **核心价值**：
    1.  **数据资产化**：将散乱的手动下载文件，转化为结构清晰、版本可控的本地数据资产。
    2.  **流程自动化**：将繁琐的数据清洗、格式转换工作，通过调用LLM API实现“一键标准化”。
    3.  **分析个性化**：提供强大的数据合并与基于规约的可视化能力，满足深度、定制的宏观分析需求。

### 2. 技术栈选型
| 组件 | 推荐技术 | 说明 |
| :--- | :--- | :--- |
| **前端框架** | React 18 + TypeScript + Vite | 构建高效、类型安全的用户界面。 |
| **后端框架** | Next.js (App Router) / Express.js | 推荐使用Next.js以简化全栈开发，无缝处理API路由和文件操作。 |
| **文件存储** | Node.js `fs` 模块 | 直接读写本地项目目录下的文件系统，无需数据库。 |
| **LLM API** | DeepSeek API | 用于数据格式转换和可视化规约生成。 |


### 3. 系统架构与核心模块设计
```
项目根目录 (macro-data-studio)
├── public/
├── src/
│   ├── app/                    # (如果使用Next.js App Router)
│   │   ├── api/               # API路由：文件上传、调用LLM等
│   │   ├── dashboard/         # 主仪表板页面
│   │   └── ...
│   ├── components/            # 公共组件
│   ├── lib/                   # 工具函数（文件操作、数据合并算法等）
│   ├── types/                 # TypeScript 类型定义
│   └── data-store/            # **核心：本地数据存储目录（需gitignore）**
│       ├── datasets.json      # 数据集注册表（索引所有数据集）
│       └── {dataset-id}/      # 单个数据集目录
│           ├── metadata.json  # 数据集元信息
│           ├── raw/           # 原始CSV文件，按时间戳命名
│           └── processed/     # 处理后的JSON文件，按时间戳命名
└── ...配置文件
```

### 4. 核心功能流程与API设计
**4.1 数据集管理**
*   **创建数据集**：用户在UI-1输入名称、描述、来源，系统创建目录和 `metadata.json`。用户会同时上传一份初始数据
        - 调用`POST /api/datasets/{id}/upload`, 成功创建则返回201,以及数据集id,页面将自动跳转到数据集UI(UI-2)
        - 对于用户上传的原始数据,后台应调用LLM模型进行预处理,理解其数据结构,生成今后更新数据需要的prompt
*   **管理数据集**：用户在UI-2可以对数据进行管理操作,包括
    *   接收CSV文件，以 `YYYYMMDD_HHmmss.csv` 格式存入 `raw/` `POST /api/datasets/{id}/upload`。
    *   触发后端调用DeepSeek API进行转换。
*   **调用LLM转换**：后端服务将CSV内容、转换指令（Prompt）发送至DeepSeek API。
    *   **提示词示例**：“请将以下CSV格式的中国CPI数据转换为JSON数组...确保字段包括：`year`, `month`, `category`, `value`...”
    *   将返回的JSON以同名时间戳存入 `processed/`。
*   **列出数据集/版本**：读取 `datasets.json` 和各个 `metadata.json`，供前端展示。

**4.2 数据合并**
*   **功能**：用户选择同一数据集下的多个JSON版本，前端或后端执行合并。
*   **算法逻辑**：这是一个纯编程问题，无需LLM。
    1.  读取选中的多个JSON文件。
    2.  根据数据的时间维度（如`year`, `month`）和类别维度进行**全连接合并**。
    3.  处理重复项：对于同一时间同一指标，可提供策略（保留最新版本、取平均值、让用户选择）。
    4.  输出一个新的、合并后的JSON数据对象，并可选择保存为新的“处理版本”。
*   **API**：`POST /api/datasets/{id}/merge` (接收要合并的文件名列表)。

**4.3 可视化生成与渲染**
*   **生成可视化规约**：`POST /api/visualize/generate-spec`
    *   **输入**：目标数据的JSON样本、用户自然语言描述（如“绘制2020-2024年CPI和PPI的同比增速对比折线图”）。
    *   **过程**：后端调用DeepSeek API，要求其返回一个符合ECharts配置选项的JSON对象。
    *   **输出**：一个标准的ECharts `option` 配置对象。
*   **渲染图表**：前端接收 **数据JSON** 和 **规约JSON**，使用ECharts组件动态初始化图表。

#### 5. 关键数据结构示例
```typescript
// types/index.ts
interface DatasetMetadata {
  id: string;
  name: string;
  description: string;
  source: string;
  created: string;
  updated: string;
}

interface DataVersion {
  timestamp: string; // 与文件名对应
  rawFileName: string;
  processedFileName?: string;
  note?: string;
}

// 存储在 datasets.json 中
interface DatasetRegistry {
  [datasetId: string]: {
    metadata: DatasetMetadata;
    versions: DataVersion[];
  };
}
```

#### 6. 开发与部署建议
1.  **分阶段开发**：
    *   **Phase 1**：实现基础项目、文件系统操作、数据集CRUD、CSV上传与展示。
    *   **Phase 2**：集成DeepSeek API，完成数据转换管道。
    *   **Phase 3**：实现数据合并算法。
    *   **Phase 4**：实现“可视化规约生成与渲染”这一核心亮点功能。
2.  **安全性**：
    *   **API密钥**：DeepSeek API密钥必须存储在环境变量（`.env.local`）中，**严禁**提交到前端代码或版本库。
    *   **文件操作**：对用户输入的文件路径进行严格校验，防止目录遍历攻击。
3.  **部署**：由于重度依赖本地文件系统，此应用**不适合部署到Vercel等无状态云平台**。建议在本地开发运行，或部署到拥有持久化存储的服务器（如使用Docker部署到自有VPS）。

### 💎 总结与最后建议
你的架构设计优秀，可行性很高。它成功地将一个宏观研究者的工作流（收集-清洗-分析-可视化）进行了产品化抽象。

**给你的行动路线图**：
1.  **环境搭建**：用 `npx create-next-app@latest --typescript` 初始化项目，并安装UI库和ECharts。
2.  **实现文件系统基石**：先在不涉及UI的情况下，用Node.js脚本实现 `data-store` 目录的创建、读写逻辑。
3.  **构建数据集管理后台**：实现最基本的列表、创建、上传CSV并保存到 `raw/` 的功能。
4.  **集成DeepSeek**：这是第一个关键突破点，完成它会让项目立刻变得强大。
5.  **后续功能**：按顺序开发合并、可视化功能。
