# AgroWater Smart

Simulador acadêmico de irrigação que compara um timer de horários fixos com um controle por regras que considera a umidade do solo e a previsão de chuva. A aplicação é feita com React, TypeScript e Vite.

> **Projeto demonstrativo:** os dados são simulados. Não há conexão com sensores, válvulas, LoRaWAN ou previsão meteorológica real. Os resultados não comprovam economia em campo.

## Como abrir

### Pré-requisitos

- Node.js 22.12 ou mais recente, com npm.
- Um navegador atualizado.

### Instalação e execução

Baixe o repositório ou clone-o pelo GitHub. Abra um terminal na pasta do projeto e execute:

```bash
npm ci
npm run dev
```

Abra **http://127.0.0.1:3000/** no navegador. Se a porta estiver ocupada, use o endereço informado no terminal. Para encerrar, pressione `Ctrl+C` no terminal.

## Como demonstrar

1. Na **Visão geral**, observe os quatro setores simulados: tomate, milho, alface e feijão.
2. Abra o **Modo Apresentação** para percorrer as situações de seca, previsão de chuva, falha e recuperação de leitura.
3. Abra **Comparação**. A sessão é reiniciada e o cenário de sete dias com chuva diária é executado automaticamente e pausado no resultado.

Nesse cenário específico, o timer bombeia **504.000 L** e o AgroWater **0 L**. A chuva simulada é de 10 mm por dia, com previsão de 80% antes da chuva. Os valores representam água bombeada, não a quantidade de chuva. Horários, vazões e clima são hipóteses do modelo, não medições de uma propriedade.

No cenário base de 24 horas mencionado nos slides, foram simulados **72.000 L** para o timer e **388.800 L** para o controle por regras: nesse teste não houve economia. Portanto, os resultados dependem do cenário e não devem ser generalizados.

O KNN é um modo alternativo demonstrativo, treinado com dados sintéticos; o controle por regras é o padrão. A simulação não substitui calibração agronômica nem testes reais.

## Testes e compilação

```bash
npm test
npm run build
npm run preview
```

O primeiro comando executa os testes automatizados. O segundo gera a versão compilada em `dist/`; o terceiro serve essa versão localmente. A pasta `dist/` e `node_modules/` são geradas localmente e não precisam estar no repositório.

## Estrutura

```text
src/
  components/   telas e componentes do simulador
  services/     balanço hídrico, fases de demonstração e KNN
  store/        estado e execução da simulação
  types/        tipos TypeScript
  __tests__/    testes automatizados
index.html      página de entrada
package.json    comandos e dependências
```

## Limitações

- A umidade mostrada é volumétrica, individual por setor; os percentuais não precisam somar 100%.
- Os dois métodos simulados têm seus próprios estados de solo e recebem o mesmo clima.
- O indicador de minutos abaixo do limiar soma os tempos dos setores; não mede a intensidade do déficit.
- A evapotranspiração de referência (ET₀) é uma entrada do modelo. O simulador não é uma previsão de produtividade ou de consumo real.
- O circuito Wokwi, quando usado separadamente, não está integrado ao painel.
