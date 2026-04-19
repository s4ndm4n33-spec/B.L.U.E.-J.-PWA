from dataclasses import dataclass

import win32com.client


@dataclass(frozen=True)
class JVoice:
    """A tiny, reliable Windows SAPI voice wrapper."""
    rate: int = 0
    volume: int = 100

    def say(self, text: str) -> None:
        """Speak text aloud."""
        if not text.strip():
            return

        try:
            voice_engine = win32com.client.Dispatch('SAPI.SpVoice')
            voice_engine.Rate = self.rate
            voice_engine.Volume = self.volume
            voice_engine.Speak(text)
        except OSError as exc:
            raise RuntimeError(f'SAPI voice failed: {exc}') from exc


def main() -> None:
    """Demonstrate JVoice."""
    voice = JVoice(rate=0, volume=100)
    voice.say('Systems online. Awaiting your next questionable decision.')


if __name__ == '__main__':
    main()