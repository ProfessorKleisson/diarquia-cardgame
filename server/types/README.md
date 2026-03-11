# Tipos do Servidor (server/types)

Este módulo centraliza todas as interfaces TypeScript usadas no lado do servidor.

## Interfaces

### `CardClass`
Union type com as 9 classes de carta disponíveis no jogo:
- `Golpe Partidário`, `Golpe Militar`, `Golpe Sorrateiro`
- `Monarquia`, `Diarquia`, `Revolução`
- `Liberais Clássicos`, `Golpe Religioso`, `Especial`

### `Card`
Representa uma carta individual.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `string` | UUID único por instância |
| `class` | `CardClass` | Classe da carta |
| `name` | `string` | Nome exibido |
| `description` | `string` | Texto com efeito e regras de bloqueio |
| `type` | `"attack" \| "defense" \| "benefit" \| "special"` | Categoria de uso |
| `power` | `string?` | Identificador de lógica de efeito |
| `image` | `string?` | Caminho relativo para imagem |

### `Player`
Estado de um jogador dentro de uma partida.

| Campo | Descrição |
|-------|-----------|
| `hand` | Cartas na mão (privado por jogador) |
| `visibleCard` | Carta virada para cima (pública) |
| `coins` | Moedas acumuladas |
| `protectionTurns` | Turnos restantes de imunidade |
| `isSlaveOf` | ID do escravizador (se escravizado) |
| `isSlaverOf` | ID do escravo (se escravizador) |
| `skipNextTurn` | Marcador de turno pulado |
| `preventCoup` | Bloqueado de vencer este turno |

### `Room`
Estado completo de uma sala de jogo.

| Campo | Descrição |
|-------|-----------|
| `turnPhase` | Fase atual do turno |
| `pendingAction` | Ação aguardando defesa |
| `pendingChoice` | Escolha binárica pendente (ex: Adam Smith) |
| `pendingCardSelection` | Seleção de carta pendente (ex: Inquisição) |
| `pendingRotateSelection` | Seleção para rotação (Rousseau/Robespierre) |
| `diarchy` | Par de jogadores em Diarquia |

### `turnPhase` — Ciclo de um turno

```
start → (take_coins | draw_card | draw_from_discard)
      → action → play_card
              → [waiting_defense] → respond_defense
              → [waiting_choice] → submit_choice
              → [waiting_card_selection] → submit_card_selection
              → [waiting_rotate_selection] → submit_rotate_selection
              → nextTurn()
```
