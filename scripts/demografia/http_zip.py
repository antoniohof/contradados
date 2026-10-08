"""Lê um membro de um zip remoto sem baixar o zip inteiro (HTTP Range).

O CDN do TSE aceita Range; o zip de 2022 tem 580 MB, mas o membro _BR com o
presidente por zona é uma fração disso.
"""
import io
import requests


class HttpFile(io.RawIOBase):
    def __init__(self, url, block=8 << 20):
        self.url, self.block, self.pos = url, block, 0
        self.size = int(requests.head(url, timeout=60).headers["content-length"])
        self.cache = {}

    def seekable(self):
        return True

    def readable(self):
        return True

    def tell(self):
        return self.pos

    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else self.pos + off if whence == 1 else self.size + off
        return self.pos

    def _blk(self, i):
        if i not in self.cache:
            a = i * self.block
            b = min(a + self.block, self.size) - 1
            r = requests.get(self.url, headers={"Range": f"bytes={a}-{b}"}, timeout=300)
            r.raise_for_status()
            if len(self.cache) > 4:
                self.cache.pop(next(iter(self.cache)))
            self.cache[i] = r.content
        return self.cache[i]

    def read(self, n=-1):
        if n is None or n < 0:
            n = self.size - self.pos
        out = bytearray()
        while n > 0 and self.pos < self.size:
            i, o = divmod(self.pos, self.block)
            chunk = self._blk(i)[o:o + n]
            out += chunk
            self.pos += len(chunk)
            n -= len(chunk)
        return bytes(out)

    def readinto(self, b):
        d = self.read(len(b))
        b[:len(d)] = d
        return len(d)
