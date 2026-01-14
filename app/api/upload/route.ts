import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-session';
import { uploadFile, generateFileKey } from '@/lib/storage';

export async function POST(request: Request) {
  try {
    // Verify authentication using Better Auth
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'uploads';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size should be less than 5MB' },
        { status: 400 }
      );
    }

    // Convert File to Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique file key
    const fileKey = generateFileKey(folder, file.name, session.user.id);

    console.log('Uploading file:', {
      fileName: file.name,
      fileKey,
      fileSize: file.size,
      fileType: file.type,
      userId: session.user.id
    });

    // Upload to Backblaze B2
    const publicUrl = await uploadFile(buffer, fileKey, file.type);

    console.log('Upload successful:', {
      key: fileKey,
      publicUrl
    });

    return NextResponse.json({
      success: true,
      publicUrl,
      key: fileKey
    });
  } catch (error) {
    console.error('Error handling upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
