import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type BrandCount = {
  brand: string;
  count: number;
};

type ActivityItem = {
  type: "bag" | "wishlist";
  date: string;
  brand: string;
  model: string;
};

function getDateKey(dateString: string) {
  return new Date(dateString).toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing admin environment variables." },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: usersData, error: usersError } =
      await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    const { count: bagsCount, error: bagsCountError } = await admin
      .from("bags")
      .select("*", { count: "exact", head: true });

    if (bagsCountError) {
      return NextResponse.json(
        { error: bagsCountError.message },
        { status: 500 }
      );
    }

    const { count: wishlistCount, error: wishlistCountError } = await admin
      .from("wishlist_items")
      .select("*", { count: "exact", head: true });

    if (wishlistCountError) {
      return NextResponse.json(
        { error: wishlistCountError.message },
        { status: 500 }
      );
    }

    const { data: bagsData, error: bagsDataError } = await admin
      .from("bags")
      .select("brand, model, created_at")
      .order("created_at", { ascending: false });

    if (bagsDataError) {
      return NextResponse.json(
        { error: bagsDataError.message },
        { status: 500 }
      );
    }

    const { data: wishlistData, error: wishlistDataError } = await admin
      .from("wishlist_items")
      .select("brand, model, created_at")
      .order("created_at", { ascending: false });

    if (wishlistDataError) {
      return NextResponse.json(
        { error: wishlistDataError.message },
        { status: 500 }
      );
    }

    const brandMap = new Map<string, number>();
    const savesPerDayMap = new Map<string, number>();

    for (const bag of bagsData || []) {
      const brand = (bag.brand || "Unknown").trim();
      brandMap.set(brand, (brandMap.get(brand) || 0) + 1);

      const dateKey = getDateKey(bag.created_at);
      savesPerDayMap.set(dateKey, (savesPerDayMap.get(dateKey) || 0) + 1);
    }

    const topBrands: BrandCount[] = Array.from(brandMap.entries())
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const savesPerDay = Array.from(savesPerDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);

    const activity: ActivityItem[] = [];

    for (const bag of bagsData || []) {
      activity.push({
        type: "bag",
        date: bag.created_at,
        brand: bag.brand || "Unknown",
        model: bag.model || "Unknown",
      });
    }

    for (const item of wishlistData || []) {
      activity.push({
        type: "wishlist",
        date: item.created_at,
        brand: item.brand || "Unknown",
        model: item.model || "Unknown",
      });
    }

    activity.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const recentActivity = activity.slice(0, 20);

    return NextResponse.json({
      totalUsers: usersData.users.length,
      totalArchivePieces: bagsCount || 0,
      totalWishlistItems: wishlistCount || 0,
      topBrands,
      savesPerDay,
      recentActivity,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Something went wrong." },
      { status: 500 }
    );
  }
}