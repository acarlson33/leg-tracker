export type UpdateStageActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialUpdateStageActionState: UpdateStageActionState = {
  status: "idle",
  message: "",
};
