import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/ai-task", async (req, res) => {
  try {
    const { text } = req.body ?? {};

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Task text is required." });
    }

    const response = await client.responses.create({
      model: "gpt-5.4",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You convert rough task requests into clean structured task data. " +
                "Return only valid JSON matching the schema.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "task_assist",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              deadline_hint: { type: "string" },
            },
            required: ["title", "description", "deadline_hint"],
          },
        },
      },
    });

    const outputText = response.output_text;
    const parsed = JSON.parse(outputText);

    res.json(parsed);
  } catch (err) {
    console.error("[ai-task] error:", err);
    res.status(500).json({ error: "Failed to generate task suggestion." });
  }
});

app.post("/ai-assign", async (req, res) => {
  try {
    const { tasks, members } = req.body ?? {};

    if (!Array.isArray(tasks) || !Array.isArray(members)) {
      return res.status(400).json({ error: "Tasks and members are required." });
    }

    const response = await client.responses.create({
      model: "gpt-5.4",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are an assignment planner for a team task board. " +
                "Group related tasks to reduce context switching, but prioritize fairness and avoid overloaded members. " +
                "For each task, return a recommended member, short reason, confidence level, and 2 to 4 short reason tags. " +
                "Confidence must be one of HIGH, MEDIUM, LOW. " +
                "Reason tags should be short phrases like low workload, similar work, available, balanced distribution. " +
                "Return only valid JSON matching the schema."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({ tasks, members })
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "assignment_plan",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              assignments: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    task_id: { type: "string" },
                    recommended_member_id: { type: "string" },
                    recommended_member_name: { type: "string" },
                    reason: { type: "string" },
                    group_label: { type: "string" },
                    confidence: {
                      type: "string",
                      enum: ["HIGH", "MEDIUM", "LOW"]
                    },
                    reason_tags: {
                      type: "array",
                      items: { type: "string" }
                    }
                  },
                  required: [
                    "task_id",
                    "recommended_member_id",
                    "recommended_member_name",
                    "reason",
                    "group_label",
                    "confidence",
                    "reason_tags"
                  ]
                }
              }
            },
            required: ["assignments"]
          }
        }
      }
    });

    res.json(JSON.parse(response.output_text));
  } catch (err) {
    console.error("[ai-assign] error:", err);
    res.status(500).json({ error: "Failed to generate assignment plan." });
  }
});

app.post("/ai-reassign", async (req, res) => {
  try {
    const { tasks, members, draft, locked_task_id } = req.body ?? {};

    if (
      !Array.isArray(tasks) ||
      !Array.isArray(members) ||
      !Array.isArray(draft) ||
      !locked_task_id
    ) {
      return res.status(400).json({
        error: "Tasks, members, draft, and locked_task_id are required.",
      });
    }

    const response = await client.responses.create({
      model: "gpt-5.4",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are rebalancing a draft task assignment plan for a team. " +
                "One task assignment is locked and must stay exactly as given. " +
                "Reassign the remaining tasks to improve fairness, reduce overload, and group similar work where reasonable. " +
                "Never change the locked task assignment. " +
                "For each task, return a recommended member, short reason, confidence level, and 2 to 4 short reason tags. " +
                "Confidence must be one of HIGH, MEDIUM, LOW. " +
                "Reason tags should be short phrases like low workload, similar work, available, balanced distribution, manual lock respected. " +
                "Return only valid JSON matching the schema."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                tasks,
                members,
                draft,
                locked_task_id
              })
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "reassignment_plan",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              assignments: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    task_id: { type: "string" },
                    recommended_member_id: { type: "string" },
                    recommended_member_name: { type: "string" },
                    reason: { type: "string" },
                    group_label: { type: "string" },
                    confidence: {
                      type: "string",
                      enum: ["HIGH", "MEDIUM", "LOW"]
                    },
                    reason_tags: {
                      type: "array",
                      items: { type: "string" }
                    }
                  },
                  required: [
                    "task_id",
                    "recommended_member_id",
                    "recommended_member_name",
                    "reason",
                    "group_label",
                    "confidence",
                    "reason_tags"
                  ]
                }
              }
            },
            required: ["assignments"]
          }
        }
      }
    });

    res.json(JSON.parse(response.output_text));
  } catch (err) {
    console.error("[ai-reassign] error:", err);
    res.status(500).json({ error: "Failed to rebalance draft plan." });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`AI server running on http://localhost:${port}`);
});