import { html, LitElement } from 'lit';
import { state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { contextProvided } from '@lit-labs/context';

import {
  ProfilesStore,
  profilesStoreContext,
} from '@holochain-open-dev/profiles';
import {
  Card,
  List,
  ListItem,
  Icon,
  CircularProgress,
} from '@scoped-elements/material-web';
import { StoreSubscriber } from 'lit-svelte-stores';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';

import { ChessService } from '../chess.service';
import { ChessGameResult } from '../types';
import { sharedStyles } from './sharedStyles';
import { chessServiceContext } from '../context';

export class ChessGameResultsHistory extends ScopedElementsMixin(LitElement) {
  @state()
  _chessGameResults!: Array<[string, ChessGameResult]>;

  @contextProvided({ context: chessServiceContext })
  _chessService!: ChessService;

  @contextProvided({ context: profilesStoreContext })
  _profilesStore!: ProfilesStore;

  _knownProfiles = new StoreSubscriber(
    this,
    () => this._profilesStore.knownProfiles
  );

  async firstUpdated() {
    const results = await this._chessService.getMyGameResults();

    const promises = results.map(async r =>
      this._profilesStore.fetchAgentProfile(this.getOpponentAddress(r[1]))
    );
    await Promise.all(promises);
    this._chessGameResults = results;
  }

  getOpponentAddress(result: ChessGameResult) {
    const myAddress = this._profilesStore.myAgentPubKey;

    return result.black_player === myAddress
      ? result.white_player
      : result.black_player;
  }

  getResult(result: ChessGameResult) {
    const winner = Object.keys(result.winner)[0];
    if (winner === 'Draw') return 'Draw';

    const myAddress = this._profilesStore.myAgentPubKey;

    const winnerAddress =
      winner === 'White' ? result.white_player : result.black_player;
    return myAddress === winnerAddress ? 'Won' : 'Lost';
  }

  getIcon(result: ChessGameResult) {
    if (this.getResult(result) === 'Draw') return 'drag_handle';
    if (this.getResult(result) === 'Won') return 'thumb_up';
    if (this.getResult(result) === 'Lost') return 'thumb_down';
  }

  getColor(result: ChessGameResult) {
    if (this.getResult(result) === 'Draw') return 'grey';
    if (this.getResult(result) === 'Won') return 'green';
    return 'red';
  }

  getSummary() {
    let summary = {
      Draw: 0,
      Lost: 0,
      Won: 0,
    };

    for (const result of this._chessGameResults) {
      summary[this.getResult(result[1])]++;
    }

    return summary;
  }

  renderResults() {
    if (this._chessGameResults.length === 0)
      return html`<div class="column center-content" style="flex: 1;">
        <span class="placeholder">There are no games in your history yet</span>
      </div>`;

    return html`<div class="flex-scrollable-parent">
      <div class="flex-scrollable-container">
        <div class="flex-scrollable-y">
          <mwc-list disabled>
            ${this._chessGameResults.map(
              result =>
                html`<mwc-list-item twoline graphic="icon">
                  <span
                    >vs
                    ${this._knownProfiles.value[
                      this.getOpponentAddress(result[1])
                    ].nickname}
                  </span>
                  <span slot="secondary"
                    >${new Date(result[1].timestamp).toLocaleString()}</span
                  >
                  <mwc-icon
                    slot="graphic"
                    style=${styleMap({
                      color: this.getColor(result[1]),
                    })}
                    >${this.getIcon(result[1])}</mwc-icon
                  >
                </mwc-list-item>`
            )}
          </mwc-list>
        </div>
      </div>
    </div>`;
  }

  render() {
    if (!this._chessGameResults)
      return html`<div class="column center-content" style="flex: 1;">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`;

    const summary = this.getSummary();

    return html`
      <mwc-card style="flex: 1; min-width: 270px;">
        <div class="column" style="margin: 16px; flex: 1;">
          <span class="title">Game History</span>
          ${this.renderResults()}
          <div class="row center-content">
            <span class="placeholder"
              >Summary: ${summary.Won} ${summary.Won === 1 ? 'win' : 'wins'},
              ${summary.Lost} ${summary.Lost === 1 ? 'loss' : 'losses'},
              ${summary.Draw} ${summary.Draw === 1 ? 'draw' : 'draws'}</span
            >
          </div>
        </div>
      </mwc-card>
    `;
  }

  static get scopedElements() {
    return {
      'mwc-icon': Icon,
      'mwc-card': Card,
      'mwc-list': List,
      'mwc-list-item': ListItem,
      'mwc-circular-progress': CircularProgress,
    };
  }

  static styles = [sharedStyles];
}
