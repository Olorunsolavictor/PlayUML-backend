import mongoose from "mongoose";

const jobStepSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ["running", "succeeded", "failed"],
      required: true,
    },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, default: null },
    error: { type: String, default: null },
  },
  { _id: false },
);

const jobRunSchema = new mongoose.Schema(
  {
    jobName: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["running", "succeeded", "failed"],
      required: true,
      index: true,
    },
    startedAt: { type: Date, required: true, index: true },
    finishedAt: { type: Date, default: null },
    error: { type: String, default: null },
    steps: { type: [jobStepSchema], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

jobRunSchema.index({ jobName: 1, startedAt: -1 });

export default mongoose.model("JobRun", jobRunSchema);
