import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const company = await prisma.company.findFirst({
      where: { deletedAt: null },
    });

    if (!company) {
      return NextResponse.json({
        name: 'Saini Tubewell Boring Service',
        shortName: 'STBS',
        tagline: 'Drilling deep. Building trust.',
      });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error('Failed to fetch company settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const existing = await prisma.company.findFirst({ where: { deletedAt: null } });

    let company;
    if (existing) {
      company = await prisma.company.update({
        where: { id: existing.id },
        data: {
          name: body.name,
          shortName: body.shortName,
          tagline: body.tagline,
          description: body.description || null,
          logoUrl: body.logoUrl || null,
          bannerUrl: body.bannerUrl || null,
          phone1: body.phone1 || null,
          phone2: body.phone2 || null,
          email: body.email || null,
          website: body.website || null,
          addressLine1: body.addressLine1 || null,
          addressLine2: body.addressLine2 || null,
          city: body.city || null,
          state: body.state || null,
          pinCode: body.pinCode || null,
          country: body.country || 'India',
          gstNumber: body.gstNumber || null,
          panNumber: body.panNumber || null,
          cinNumber: body.cinNumber || null,
          bankName: body.bankName || null,
          bankAccountNo: body.bankAccountNo || null,
          bankIfsc: body.bankIfsc || null,
          bankBranch: body.bankBranch || null,
          directorName: body.directorName || null,
          directorTitle: body.directorTitle || null,
        },
      });
    } else {
      company = await prisma.company.create({
        data: {
          name: body.name,
          shortName: body.shortName,
          tagline: body.tagline,
          description: body.description || null,
          logoUrl: body.logoUrl || null,
          bannerUrl: body.bannerUrl || null,
          phone1: body.phone1 || null,
          phone2: body.phone2 || null,
          email: body.email || null,
          website: body.website || null,
          addressLine1: body.addressLine1 || null,
          addressLine2: body.addressLine2 || null,
          city: body.city || null,
          state: body.state || null,
          pinCode: body.pinCode || null,
          country: body.country || 'India',
          gstNumber: body.gstNumber || null,
          panNumber: body.panNumber || null,
          cinNumber: body.cinNumber || null,
          bankName: body.bankName || null,
          bankAccountNo: body.bankAccountNo || null,
          bankIfsc: body.bankIfsc || null,
          bankBranch: body.bankBranch || null,
          directorName: body.directorName || null,
          directorTitle: body.directorTitle || null,
        },
      });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error('Failed to update company settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
