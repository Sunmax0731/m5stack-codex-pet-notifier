# Post MVP Roadmap

## Alpha 2

- Codex App Server public interface の実接続確認を行う。
- Host Bridge を HTTP / WebSocket server として起動できるようにする。
- Core2 実機 build / flash / long-run soak の証跡を追加する。
- 署名付き MSI / MSIX の実署名と installer 起動証跡を追加する。

## Beta

- MQTT adapter を追加し、Home Assistant 連携を検証する。
- pet sprite cache の権利境界と変換 pipeline を確定する。
- 複数 M5Stack device の registration と revocation を追加する。

## Stable候補

- manual test evidence、regression baseline、security/privacy evidence、release asset の再現性をそろえる。
- stable release では `latest=true` を許容できる状態にする。
