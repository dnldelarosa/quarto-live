import { WebR, RObject, RLogical, isRNull } from 'webr'
import { WebREvaluator, EvaluateOptions, EnvLabels, OJSElement } from "./evaluate"
import { EnvironmentManager } from './environment'
import { isRFunction } from "webr"

export type ExerciseGraderCode = {
  code_check?: string;
  error_check?: string;
  check?: string;
  solution?: string;
}

export class WebRGrader {
  evaluator: WebREvaluator;
  grading: ExerciseGraderCode;
  options: EvaluateOptions;
  envLabels: EnvLabels;
  envManager: EnvironmentManager;
  webR: WebR;
  constructor(evaluator: WebREvaluator, grading: ExerciseGraderCode) {
    this.grading = grading;
    this.evaluator = evaluator;
    this.envManager = this.evaluator.envManager;
    this.envLabels = this.evaluator.envLabels;

    // Fixed grading options
    this.options = {
      envir: this.evaluator.options.envir,
      eval: true,
      echo: false,
      warning: true,
      error: false,
      include: true,
      output: true,
      timelimit: 600,
    };
  }

  async setupGrading() {
    // Create new grading environment
    await this.envManager.create(this.envLabels.grading, this.envLabels.result);

    // Build environment items for grading functions
    const envir_prep = await this.envManager.get(this.envLabels.prep);
    const envir_result = await this.envManager.get(this.envLabels.result);
    const last_value = this.evaluator.container.value.result;
    const evaluate_result = this.evaluator.container.value.evaluate_result;

    this.evaluator.bind(".engine", "r", "grading");
    this.evaluator.bind(".label", this.evaluator.options.exercise, "grading");
    this.evaluator.bind(".user_code", this.evaluator.context.editor.value.code, "grading");
    this.evaluator.bind(".last_value", last_value, "grading");
    this.evaluator.bind(".result", last_value, "grading");
    this.evaluator.bind(".user", last_value, "grading");
    this.evaluator.bind(".envir_prep", envir_prep, "grading");
    this.evaluator.bind(".envir_result", envir_result, "grading");
    this.evaluator.bind(".evaluate_result", evaluate_result, "grading");
  }

  async check(): Promise<OJSElement | HTMLElement | null> {
    const shelter = await this.evaluator.shelter;
    const grading = await this.envManager.get(this.envLabels.grading);
    try {
      const checkFunction = await shelter.evalR(this.grading.check, { env: grading });
      let checkCode = this.grading.check;
      if (isRFunction(checkFunction)) {
        checkCode = ".checkFunction(environment())";
        await this.evaluator.bind(".checkFunction", checkFunction, "grading");
      }

      const capture = await this.evaluator.evaluate(checkCode, "grading", this.options);
      if (isRNull(capture)) {
        return null;
      } else {
        const container = await this.evaluator.asHtml(capture, this.options);
        const result = await container.value.result as RObject;
        const classList = await (await result.class()).toArray();
        if (classList.includes("gradethis_graded")) {
          return await this.feedbackAsHtml(result);
        } else {
          return container;
        }
      }
    } finally {
      shelter.purge()
    }
  }

  async feedbackAsHtml(grade: RObject): Promise<HTMLElement> {
    const container = document.createElement("div");
    const type = await grade.get('type');
    const correct = await grade.get('correct') as RLogical;
    container.classList.add("alert");

    switch (await type.toString()) {
      case "success":
        container.classList.add("alert-success");
        break;
      case "info":
        container.classList.add("alert-info");
        break;
      case "warning":
        container.classList.add("alert-warning");
        break;
      case "error":
      case "danger":
        container.classList.add("alert-danger");
        break;
      default:
        if (await correct.toBoolean()) {
          container.classList.add("alert-success");
        } else {
          container.classList.add("alert-danger");
        }
    }

    const content = document.createElement("span");
    const message = await grade.get('message');
    content.innerText = await message.toString();

    container.appendChild(content);
    return container;
  }
}