import {
  TemplateResult,
  customElement,
  LitElement,
  property,
  html,
  CSSResult,
  css
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

import { RestrictionCardConfig } from "./types";
import {
  HomeAssistant,
  createThing,
  LovelaceCard,
  computeCardSize,
  LovelaceCardConfig
} from "custom-card-helpers";

@customElement("restriction-card")
class RestrictionCard extends LitElement implements LovelaceCard {
  @property() protected _config?: RestrictionCardConfig;
  protected _hass?: HomeAssistant;

  set hass(hass: HomeAssistant) {
    this._hass = hass;

    const element = this.shadowRoot!.querySelector("#card > *") as LovelaceCard;
    if (element) {
      element.hass = hass;
    }
  }

  public getCardSize(): number {
    const element = this.shadowRoot!.querySelector("#card > *") as LovelaceCard;
    if (element) {
      return computeCardSize(element);
    }

    return 1;
  }

  public setConfig(config: RestrictionCardConfig): void {
    if (!config.card) {
      throw new Error("Error in card configuration.");
    }

    if (
      config.restrictions &&
      config.restrictions.pin &&
      !config.restrictions.pin.code
    ) {
      throw new Error("A pin code is required for pin restrictions");
    }

    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this._hass) {
      return html``;
    }

    if (
      this._config.restrictions &&
      this._config.restrictions.hide &&
      (!this._config.restrictions.hide.exemptions ||
        !this._config.restrictions.hide.exemptions.some(
          e => e.user === this._hass!.user!.id
        ))
    ) {
      return html``;
    }

    console.log(
      "blocked: " +
        Boolean(
          this._config.restrictions &&
            this._config.restrictions.block &&
            (!this._config.restrictions.block.exemptions ||
              !this._config.restrictions.block.exemptions.some(
                e => e.user === this._hass!.user!.id
              ))
        )
    );

    return html`
      <div>
        ${this._config.exemptions &&
        this._config.exemptions.some(e => e.user === this._hass!.user!.id)
          ? ""
          : html`
              <div
                @click=${this._handleClick}
                id="overlay"
                class="${classMap({
                  blocked: Boolean(
                    this._config.restrictions &&
                      this._config.restrictions.block &&
                      (!this._config.restrictions.block.exemptions ||
                        !this._config.restrictions.block.exemptions.some(
                          e => e.user === this._hass!.user!.id
                        ))
                  )
                })}"
              >
                <ha-icon icon="mdi:lock-outline" id="lock"></ha-icon>
              </div>
            `}
        ${this.renderCard(this._config.card!)}
      </div>
    `;
  }

  private renderCard(config: LovelaceCardConfig): TemplateResult {
    const element = createThing(config);
    if (this._hass) {
      element.hass = this._hass;
    }

    return html`
      <div id="card">
        ${element}
      </div>
    `;
  }

  private _handleClick(): void {
    const lock = this.shadowRoot!.getElementById("lock") as LitElement;

    if (this._config!.restrictions) {
      if (
        this._config!.restrictions.block &&
        (!this._config!.restrictions.block.exemptions ||
          !this._config!.restrictions.block.exemptions.some(
            e => e.user === this._hass!.user!.id
          ))
      ) {
        if (this._config!.restrictions.block.text) {
          alert(this._config!.restrictions.block.text);
        }

        lock.classList.add("invalid");
        window.setTimeout(() => {
          if (lock) {
            lock.classList.remove("invalid");
          }
        }, 3000);
        return;
      }

      if (
        this._config!.restrictions.pin &&
        this._config!.restrictions.pin.code &&
        (!this._config!.restrictions.pin.exemptions ||
          !this._config!.restrictions.pin.exemptions.some(
            e => e.user === this._hass!.user!.id
          ))
      ) {
        const pin = prompt(
          this._config!.restrictions.pin.text || "Input pin code"
        );

        // tslint:disable-next-line: triple-equals
        if (pin != this._config!.restrictions.pin.code) {
          lock.classList.add("invalid");
          window.setTimeout(() => {
            if (lock) {
              lock.classList.remove("invalid");
            }
          }, 3000);
          return;
        }
      }

      if (
        this._config!.restrictions.confirm &&
        (!this._config!.restrictions.confirm.exemptions ||
          !this._config!.restrictions.confirm.exemptions.some(
            e => e.user === this._hass!.user!.id
          ))
      ) {
        if (
          !confirm(
            this._config!.restrictions.confirm.text ||
              "Are you sure you want to unlock?"
          )
        ) {
          return;
        }
      }
    }

    const overlay = this.shadowRoot!.getElementById("overlay") as LitElement;
    overlay.style.setProperty("pointer-events", "none");
    lock.classList.add("fadeOut");
    window.setTimeout(() => {
      overlay.style.setProperty("pointer-events", "");
      if (lock) {
        lock.classList.remove("fadeOut");
      }
    }, 5000);
  }

  static get styles(): CSSResult {
    return css`
      :host {
        position: relative;
        --regular-lock-color: var(
          --restriction-regular-lock-color,
          var(--primary-text-color, #212121)
        );
        --success-lock-color: var(
          --restriction-success-lock-color,
          var(--primary-color, #03a9f4)
        );
        --blocked-lock-color: var(
          --restriction-blocked-lock-color,
          var(--error-state-color, #db4437)
        );
        --invalid-lock-color: var(
          --restriction-invalid--color,
          var(--error-state-color, #db4437)
        );
      }
      #overlay {
        align-items: flex-start;
        padding: 8px 7px;
        opacity: 0.5;
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        z-index: 50;
        display: flex;
        color: var(--regular-lock-color);
      }
      .blocked {
        color: var(--blocked-lock-color) !important;
      }
      #lock {
        margin: unset;
      }
      @keyframes fadeOut {
        20% {
          opacity: 0;
        }
        80% {
          opacity: 0;
        }
      }
      .fadeOut {
        animation: fadeOut 5s linear;
        color: var(--success-lock-color);
      }
      @keyframes blinker {
        50% {
          opacity: 0;
        }
      }
      .invalid {
        animation: blinker 1s linear infinite;
        color: var(--invalid-lock-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "restriction-card": RestrictionCard;
  }
}
