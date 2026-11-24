import { AgendaShareError, shareAgendaWhatsApp } from "../services/agendaShare.service.js";

const runShare = async (req, res, requestType) => {
  try {
    const data = await shareAgendaWhatsApp({
      ...req.agendaShareRequest,
      requestType,
      ipAddress: req.ip,
    });


    return res.status(200).json({
      success: true,
      message: requestType === "saved"
        ? "Your saved agenda has been accepted for WhatsApp delivery."
        : "The full agenda has been accepted for WhatsApp delivery.",
      data,
    });
  } catch (error) {
    if (error instanceof AgendaShareError) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        error: { code: error.code },
        data: error.requestId ? { requestId: error.requestId } : null,
      });
    }

    console.error("[agenda-share] controller error:", error?.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while preparing your agenda. Please try again.",
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
  }
};


export const shareSavedAgendaController = (req, res) => runShare(req, res, "saved");
export const shareFullAgendaController = (req, res) => runShare(req, res, "full");
