import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

setGlobalOptions({maxInstances: 10, region: "southamerica-east1"});

const turnstileSecret = defineSecret("TURNSTILE_SECRET_KEY");

export const verifyTurnstile = onCall(
  {secrets: [turnstileSecret]},
  async (request) => {
    const token = request.data?.token as string | undefined;

    if (!token) {
      throw new HttpsError("invalid-argument", "Token não fornecido.");
    }

    const secret = turnstileSecret.value();

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body: new URLSearchParams({secret, response: token}),
      }
    );

    const data = await res.json() as {
      success: boolean;
      "error-codes"?: string[];
    };

    logger.info("Turnstile result", {
      success: data.success,
      errors: data["error-codes"],
    });

    if (!data.success) {
      throw new HttpsError(
        "permission-denied",
        "Verificação de segurança reprovada.",
        data["error-codes"]
      );
    }

    return {success: true};
  }
);
