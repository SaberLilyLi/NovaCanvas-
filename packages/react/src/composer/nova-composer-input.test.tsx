import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Message } from '@arco-design/web-react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultImageSizeSettings } from '../image-size-settings';
import { NovaComposerInput, type NovaComposerInputProps } from './nova-composer-input';

function renderComposer(overrides: Partial<NovaComposerInputProps> = {}) {
  const onSubmit = vi.fn(async () => true);
  const props: NovaComposerInputProps = {
    defaultValue: '',
    imageSizeSettings: createDefaultImageSizeSettings(),
    count: 1,
    onImageSizeSettingsChange: vi.fn(),
    onCountChange: vi.fn(),
    onSubmit,
    ...overrides,
  };
  const result = render(<NovaComposerInput {...props} />);
  return { ...result, onSubmit };
}

function imageFile(name: string, size = 32) {
  return new File([new Uint8Array(size)], name, {
    type: 'image/png',
    lastModified: 1,
  });
}

describe('NovaComposerInput', () => {
  it('submits with Enter and clears after success', async () => {
    const { onSubmit } = renderComposer({ defaultValue: 'hello' });
    const textarea = screen.getByLabelText('创作提示词');

    fireEvent.keyDown(textarea, { key: 'Enter' });

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('hello', { attachments: [] }));
    expect((textarea as HTMLTextAreaElement).value).toBe('');
  });

  it('does not submit on Shift+Enter or during IME composition', () => {
    const { onSubmit } = renderComposer({ defaultValue: 'hello' });
    const textarea = screen.getByLabelText('创作提示词');

    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    fireEvent.compositionStart(textarea);
    fireEvent.keyDown(textarea, { key: 'Enter', isComposing: true });
    fireEvent.compositionEnd(textarea);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('adds multiple files, enforces the limit, and removes an attachment', () => {
    const warning = vi
      .spyOn(Message, 'warning')
      .mockImplementation(() => ({}) as ReturnType<typeof Message.warning>);
    renderComposer({ maxAttachments: 2 });
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;

    fireEvent.change(input, {
      target: { files: [imageFile('one.png'), imageFile('two.png'), imageFile('three.png')] },
    });

    expect(screen.getAllByTestId('image-stack-item')).toHaveLength(2);
    expect(warning).toHaveBeenCalled();
    fireEvent.click(screen.getAllByTestId('image-stack-remove')[0]!);
    expect(screen.getAllByTestId('image-stack-item')).toHaveLength(1);
  });

  it('accepts pasted images and submits attachments at send time', async () => {
    const { onSubmit } = renderComposer();
    const textarea = screen.getByLabelText('创作提示词');
    const file = imageFile('paste.png');

    fireEvent.paste(textarea, {
      clipboardData: { files: [file] },
    });
    fireEvent.click(screen.getByLabelText('发送'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        '',
        expect.objectContaining({
          attachments: [expect.objectContaining({ file, status: 'ready' })],
        }),
      ),
    );
  });

  it('keeps prompt and attachments when submit fails', async () => {
    const onSubmit = vi.fn(async () => {
      throw new Error('failed');
    });
    renderComposer({ defaultValue: 'retry me', onSubmit });
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [imageFile('retry.png')] } });

    fireEvent.click(screen.getByLabelText('发送'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect((screen.getByLabelText('创作提示词') as HTMLTextAreaElement).value).toBe(
      'retry me',
    );
    expect(screen.getAllByTestId('image-stack-item')).toHaveLength(1);
  });
});
