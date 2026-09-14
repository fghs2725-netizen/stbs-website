import { PageHeader } from "@/components/admin/PageHeader";
import { TestimonialsManager } from "@/components/admin/website/TestimonialsManager";
import { getTestimonials } from "@/lib/website/actions";
import type { SerializedTestimonial } from "@/lib/website/action-types";

export const dynamic = "force-dynamic";

export default async function WebsiteTestimonialsPage() {
  const testimonials = (await getTestimonials()) as unknown as SerializedTestimonial[];
  return (
    <>
      <PageHeader
        eyebrow="Website CMS / Testimonials"
        title="Testimonials"
        description="Only Approved testimonials are published. Keep customers as Draft/Verified until you have genuine quotes and permission."
      />
      <TestimonialsManager testimonials={testimonials} />
    </>
  );
}