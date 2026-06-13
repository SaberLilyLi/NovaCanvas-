import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ComposerInput, type ComposerInputProps } from './composer-input';

describe('ComposerInput compatibility wrapper', () => {
  it('keeps legacy props and defers onUpload until submit', async () => {
    const onUpload = vi.fn();
    const onSubmit = vi.fn();
    const props: ComposerInputProps = {
      bizType: 'used_car',
      sceneType: 'creative_poster',
      ratio: '1:1',
      count: 1,
      prompt: 'legacy prompt',
      selectedImageIds: [],
      images: [],
      isUploading: false,
      isSubmitting: false,
      onPromptChange: vi.fn(),
      onSceneTypeChange: vi.fn(),
      onRatioChange: vi.fn(),
      onCountChange: vi.fn(),
      onRemoveReference: vi.fn(),
      onUpload,
      onSubmit,
      ratioToSize: () => '1024x1024',
    };
    render(<ComposerInput {...props} />);
    const file = new File(['image'], 'legacy.png', { type: 'image/png' });
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;

    fireEvent.change(input, { target: { files: [file] } });
    expect(onUpload).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('发送'));
    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(file));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
