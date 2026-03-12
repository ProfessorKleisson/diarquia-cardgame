// ──────────────────────────────────────────────────
// Golpe — Card Definitions
// All playable cards with their static metadata.
// ──────────────────────────────────────────────────

import { v4 as uuidv4 } from "uuid";
import type { Card } from "../types";

export const CARD_DEFINITIONS: Omit<Card, "id">[] = [
    // Diarquia
    { class: "Diarquia", name: "Dom Pedro II", description: "Saca 7 moedas ou Não pode ser bloqueada.", type: "benefit", power: "draw_7_coins", image: "/cards/Diarquia/Imperador Dom Pedro II.webp" },
    { class: "Diarquia", name: "Joaquim Nabuco", description: "Saca 3 moedas do monte. Não pode ser bloqueada.", type: "benefit", power: "draw_3_coins_unblockable", image: "/cards/Diarquia/Joaquim Nabuco.webp" },
    { class: "Diarquia", name: "José Bonifácio", description: "Escolha um oponente para impedi-lo de dar Golpe por 1 rodada. Não pode ser bloqueada.", type: "special", power: "prevent_coup", image: "/cards/Diarquia/José Bonifácio.webp" },
    { class: "Diarquia", name: "Princesa Isabel", description: "Forma uma diarquia por meio do casamento e pode trocar cartas com o outro rei durante todo o jogo. Não pode ser bloqueada.", type: "special", power: "marriage_diarchy", image: "/cards/Diarquia/Princesa Isabel.webp" },

    // Especial
    { class: "Especial", name: "Albert Camus", description: "Pega as cartas dos oponentes (menos de quem tem o rei), junta ao baralho, embaralha e redistribui. Não pode ser bloqueada.", type: "special", power: "redistribute_cards", image: "/cards/Especiais/Albert Camus.webp" },
    { class: "Especial", name: "Ayn Rand", description: "Protege o jogador de qualquer ataque por 3 turnos. Não pode ser bloqueado.", type: "defense", power: "protection_3_turns", image: "/cards/Especiais/Ayn Rand.webp" },
    { class: "Especial", name: "Bobo da Corte", description: "Age como um coringa, pode ser usado para completar a tríade. Não pode ser bloqueado.", type: "special", power: "joker", image: "/cards/Especiais/Bobo da corte.webp" },
    { class: "Especial", name: "René Descartes", description: "Revela uma carta da mão de um oponente de forma privada e pode escolher se troca ou não no monte. Pode ser bloqueado por Diógenes e Protágoras.", type: "special", power: "peek_and_swap", image: "/cards/Especiais/Descartes.webp" },
    { class: "Especial", name: "Diógenes, o cão", description: "Saca 2 novas cartas ou ignora ação de qualquer carta inimiga.", type: "special", power: "draw_2_or_block", image: "/cards/Especiais/Diógenes.webp" },
    { class: "Especial", name: "Escravidão", description: "Escraviza algum jogador por 2 rodadas, ele pode ver suas cartas e pode fazer o que quiser. Bloqueada por Liberais Clássicos e Diarquia.", type: "attack", power: "slavery", image: "/cards/Especiais/escravidão.webp" },
    { class: "Especial", name: "Hannah Arendt", description: "Bloqueia qualquer carta de Golpe Partidário ou Militar e o bloqueado perde suas cartas (fundo do baralho), tem que sacar novas.", type: "defense", power: "block_coups", image: "/cards/Especiais/Hannah Arendt.webp" },
    { class: "Especial", name: "Protágoras", description: "Troca uma carta com outro jogador de sua escolha. Não pode ser bloqueado.", type: "special", power: "swap_card", image: "/cards/Especiais/Protagoras.webp" },

    // Golpe Militar
    { class: "Golpe Militar", name: "Ato Institucional Nº5", description: "Passa a vez de um jogador. Bloqueado por Hannah Arendt ou Liberal.", type: "attack", power: "skip_turn", image: "/cards/Golpe Militar/Ato institucional n5.webp" },
    { class: "Golpe Militar", name: "Emílio Garrastazu Médici", description: "Passa a vez de um jogador. Bloqueado por Hannah Arendt ou Liberal.", type: "attack", power: "skip_turn", image: "/cards/Golpe Militar/Emílio Garrastazu Médici.webp" },
    { class: "Golpe Militar", name: "Deodoro da Fonseca", description: "Passa a vez de um jogador. Bloqueado por Hannah Arendt ou Liberal.", type: "attack", power: "skip_turn", image: "/cards/Golpe Militar/Marechal Deodoro.webp" },
    { class: "Golpe Militar", name: "Floriano Peixoto", description: "Passa a vez de um jogador. Bloqueado por Hannah Arendt ou Liberal.", type: "attack", power: "skip_turn", image: "/cards/Golpe Militar/Marechal Floriano Peixoto.webp" },

    // Golpe Partidário
    { class: "Golpe Partidário", name: "Adolf Hitler", description: "Elimina uma carta sua e uma das cartas do oponente. Bloqueado por Hannah Arendt ou Winston Churchill.", type: "attack", power: "double_elimination", image: "/cards/Golpe partidário/Adolf Hitler.webp" },
    { class: "Golpe Partidário", name: "Benito Mussolini", description: "Elimina uma das cartas do oponente. Bloqueado por Hannah Arendt ou Winston Churchill.", type: "attack", power: "eliminate_card", image: "/cards/Golpe partidário/Benito Mussolini.webp" },
    { class: "Golpe Partidário", name: "Joseph Goebbels", description: "Elimina uma das cartas do oponente. Bloqueado por Hannah Arendt ou Winston Churchill.", type: "attack", power: "eliminate_card", image: "/cards/Golpe partidário/Joseph Goebbels.webp" },
    { class: "Golpe Partidário", name: "Joseph Stalin", description: "Elimina uma das cartas do oponente. Bloqueado por Hannah Arendt.", type: "attack", power: "eliminate_card", image: "/cards/Golpe partidário/Joseph Stalin.webp" },

    // Liberais Clássicos
    { class: "Liberais Clássicos", name: "Adam Smith", description: "Saca 5 moedas do monte ou saca nova carta do baralho. Não pode ser bloqueado.", type: "benefit", power: "draw_5_or_card", image: "/cards/Liberais clássicos/Adam Smith.webp" },
    { class: "Liberais Clássicos", name: "John Locke", description: "Saca 5 moedas do monte ou saca nova carta do baralho. Não pode ser bloqueado.", type: "benefit", power: "draw_5_or_card", image: "/cards/Liberais clássicos/John Locke.webp" },
    { class: "Liberais Clássicos", name: "Voltaire", description: "Bloqueia qualquer Golpe Militar e qualquer carta de Golpe Religioso.", type: "defense", power: "block_military_religious", image: "/cards/Liberais clássicos/Voltaire.webp" },
    { class: "Liberais Clássicos", name: "Montesquieu", description: "Saca 5 moedas do monte ou saca nova carta do baralho. Não pode ser bloqueado.", type: "benefit", power: "draw_5_or_card", image: "/cards/Liberais clássicos/Montesquieu.webp" },

    // Golpe Sorrateiro
    { class: "Golpe Sorrateiro", name: "Friedrich Nietzsche", description: "Saca 2 novas cartas ou ignora a ação de qualquer carta inimiga. Não pode ser bloqueado.", type: "special", power: "draw_2_or_block_unblockable", image: "/cards/Golpe sorrateiro/Friedrich Nietzsche.webp" },
    { class: "Golpe Sorrateiro", name: "Lourenço de Médici", description: "Toma 5 moedas de algum oponente. Não pode ser bloqueado.", type: "attack", power: "steal_5_coins", image: "/cards/Golpe sorrateiro/Lourenço de Médici.webp" },
    { class: "Golpe Sorrateiro", name: "Marco Júnio Bruto", description: "Elimina a carta do oponente ou troca uma carta sua com oponente. Bloqueado por Mão do Rei e José Bonifácio.", type: "attack", power: "eliminate_or_swap", image: "/cards/Golpe sorrateiro/Marco Júnio Bruto.webp" },
    { class: "Golpe Sorrateiro", name: "Nicolau Maquiavel", description: "Elimina uma carta ou obriga algum oponente a passar a vez. Não pode ser bloqueado.", type: "attack", power: "eliminate_or_skip", image: "/cards/Golpe sorrateiro/Nicolau Maquiavel.webp" },

    // Monarquia
    { class: "Monarquia", name: "Mão do Rei", description: "Forma uma diarquia por meio da diplomacia e pode trocar cartas with o outro rei durante todo o jogo. Não pode ser bloqueado.", type: "special", power: "diplomacy_diarchy", image: "/cards/Monarquia/Mão do rei.webp" },
    { class: "Monarquia", name: "Rainha Elizabeth II", description: "Saca uma moeda por rodada. Só pode ser eliminado por Golpe. Imuniza o jogador a embaralhamento.", type: "benefit", power: "passive_coin_and_immune", image: "/cards/Monarquia/Rainha Elizabeth II.webp" },
    { class: "Monarquia", name: "Thomas Hobbes", description: "Embaralha as cartas de um oponente e elimina aleatoriamente uma. Não pode ser bloqueado.", type: "attack", power: "shuffle_and_eliminate", image: "/cards/Monarquia/Thomas Hobbes.webp" },
    { class: "Monarquia", name: "Winston Churchill", description: "Determina algum jogador a trocar de carta virada para cima. Bloqueado por Revolução.", type: "special", power: "force_swap_visible", image: "/cards/Monarquia/Winston Churchill.webp" },

    // Golpe Religioso
    { class: "Golpe Religioso", name: "Cesar Borgia", description: "Elimina uma das cartas do oponente pagando 2 moedas. Não pode ser bloqueada.", type: "attack", power: "eliminate_card_cost_2", image: "/cards/Religiosa/Cesar Borgia.webp" },
    { class: "Golpe Religioso", name: "Inquisição", description: "Revela uma das cartas do oponente e escolhe uma para eliminar. Bloqueado por Liberal.", type: "attack", power: "peek_and_eliminate", image: "/cards/Religiosa/Inquisição do santo oficio.webp" },
    { class: "Golpe Religioso", name: "Templários", description: "Protege suas cartas de serem roubadas ou afetadas por 2 turnos. Bloqueado por César Borgia.", type: "defense", power: "protection_2_turns", image: "/cards/Religiosa/Templarios.webp" },
    { class: "Golpe Religioso", name: "Santo Agostinho", description: "Revela duas das cartas do oponente e escolhe uma para eliminar. Não pode ser bloqueado.", type: "attack", power: "peek_two_and_eliminate", image: "/cards/Religiosa/Santo Agostinho.webp" },

    // Revolução
    { class: "Revolução", name: "Jean-Jacques Rousseau", description: "Força todos os jogadores a passarem uma carta para a esquerda. Não pode ser bloqueado.", type: "special", power: "rotate_cards", image: "/cards/Revolução/Jean-Jacques Rousseau.webp" },
    { class: "Revolução", name: "Karl Marx", description: "Redistribui as moedas de forma igualitária. Se faltar moedas, pega no monte. Bloqueado por Liberais Clássicos.", type: "special", power: "redistribute_coins", image: "/cards/Revolução/Karl Marx.webp" },
    { class: "Revolução", name: "Maximilien Robespierre", description: "Força todos os jogadores a passarem uma carta para a esquerda. Não pode ser bloqueado.", type: "special", power: "rotate_cards", image: "/cards/Revolução/Maximilien Robespierre.webp" },
    { class: "Revolução", name: "Guilhotina", description: "Elimina uma carta do oponente, mas deve pagar 3 moedas. Não pode ser bloqueado.", type: "attack", power: "eliminate_card_cost_3", image: "/cards/Revolução/Revolução Francesa.webp" },

    // República
    { class: "República", name: "George Washington", description: "Ignora a ação de qualquer carta inimiga por 2 turnos. Não pode ser bloqueado.", type: "defense", power: "protection_2_turns", image: "/cards/República/George Washington.webp" },
    { class: "República", name: "José Martí", description: "Ignora a ação de qualquer carta inimiga. Não pode ser bloqueado.", type: "defense", power: "block_unblockable", image: "/cards/República/Jose marti.webp" },
    { class: "República", name: "Júlio César", description: "Embaralha as cartas de algum jogador com o monte e redistribui. Bloqueado por Golpe Sorrateiro.", type: "attack", power: "shuffle_and_redistribute", image: "/cards/República/Julio Cesar.webp" },
    { class: "República", name: "Platão", description: "Revela uma carta de dois jogadores. Não pode ser bloqueado.", type: "special", power: "peek_two_opponents", image: "/cards/República/Platão.webp" },

    // Anarquismo
    { class: "Anarquismo", name: "Movimento Coletivista", description: "Redistribui as moedas de forma igualitária. Se faltar moedas, pega no monte. Bloqueado por Liberais Clássicos.", type: "special", power: "redistribute_coins", image: "/cards/Anarquismo/anarquismo.webp" },
    { class: "Anarquismo", name: "Mikhail Bakunin", description: "Elimina uma carta de dois jogadores. Não pode ser bloqueado.", type: "attack", power: "eliminate_two_opponents", image: "/cards/Anarquismo/Bakunin.webp" },
    { class: "Anarquismo", name: "Henry David Thoreau", description: "Ignora a ação de qualquer carta inimiga. Não pode ser bloqueado.", type: "defense", power: "block_unblockable", image: "/cards/Anarquismo/Henry David Thoreau.webp" },
];

/** Generate a freshly shuffled deck with UUIDs assigned. */
export function generateDeck(expansionEnabled: boolean = true): Card[] {
    let pool = CARD_DEFINITIONS;
    if (!expansionEnabled) {
        pool = pool.filter((c) => c.class !== "República" && c.class !== "Anarquismo");
    }
    return pool.map((def) => ({ id: uuidv4(), ...def }))
        .sort(() => Math.random() - 0.5);
}
